import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

import { AiClientFactory } from '../../common/ai/ai-client.factory';
import { PrismaService } from '../../prisma.service';
import { ProjectRagQueryDto, RagFieldQueryDto } from './dto/project-rag-query.dto';

type BaseSegmentRow = {
    segmentId: string;
    content: string;
    metadata: Prisma.JsonValue | null;
    nodeId: string;
    nodeTitle: string;
    nodeType: string;
    snapshotId: string | null;
    orderIndex: number;
};

type VectorSegmentRow = BaseSegmentRow & {
    vectorScore: number;
};

type LexicalSegmentRow = BaseSegmentRow & {
    lexicalScore: number;
};

type HybridSegmentRow = BaseSegmentRow & {
    similarity: number;
    vectorScore?: number;
    lexicalScore?: number;
};

type CacheEntry = {
    expiresAt: number;
    value: RagChunkResult[];
};

export interface RagChunkResult {
    segmentId: string;
    nodeId: string;
    nodeTitle: string;
    nodeType: string;
    snapshotId: string | null;
    content: string;
    similarity: number;
    orderIndex: number;
    sourceType?: string;
    sourceId?: string;
    metadata?: Record<string, any>;
}

export interface RagFieldResult {
    fieldId: string;
    label: string;
    query: string;
    fromCache: boolean;
    chunks: RagChunkResult[];
}

type EmbeddingsClient = ReturnType<AiClientFactory['getEmbeddings']>;

@Injectable()
export class RagService {
    private readonly logger = new Logger(RagService.name);
    private readonly embeddingsClient: EmbeddingsClient;
    private readonly cache = new Map<string, CacheEntry>();
    private readonly cacheTtlMs = Number(process.env.RAG_CACHE_TTL_MS ?? 5 * 60 * 1000);
    private readonly defaultTopK = 5;
    private readonly maxTopK = 20;
    private readonly lexicalEnabled = (process.env.RAG_ENABLE_LEXICAL ?? 'true').toLowerCase() !== 'false';
    private readonly vectorWeight = this.normalizeWeight(process.env.RAG_HYBRID_VECTOR_WEIGHT, 0.65);
    private readonly lexicalWeight = this.normalizeWeight(process.env.RAG_HYBRID_LEXICAL_WEIGHT, 0.35);
    private readonly fullTextConfig = this.normalizeRegconfig(process.env.RAG_FTS_DICTIONARY);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiClientFactory: AiClientFactory,
    ) {
        this.embeddingsClient = this.aiClientFactory.getEmbeddings(
            process.env.RAG_EMBEDDING_MODEL || process.env.TEXT_EMBEDDING_MODEL,
        );
    }

    async getProjectContext(dto: ProjectRagQueryDto) {
        if (!dto.projectId) {
            throw new BadRequestException('projectId is required');
        }
        if (!dto.fields?.length) {
            return { projectId: dto.projectId, fields: [] as RagFieldResult[] };
        }

        const minScore = this.normalizeScore(dto.minScore);
        const defaultTopK = this.normalizeTopK(dto.defaultTopK) ?? this.defaultTopK;

        const fields = await Promise.all(
            dto.fields.map((field) =>
                this.queryField(dto.projectId, field, {
                    defaultTopK,
                    minScore,
                    requirementsModel: dto.requirementsModel,
                }),
            ),
        );

        return {
            projectId: dto.projectId,
            fields,
        };
    }

    private async queryField(
        projectId: string,
        field: RagFieldQueryDto,
        options: { defaultTopK: number; minScore: number; requirementsModel?: Record<string, any> },
    ): Promise<RagFieldResult> {
        const query = this.buildFieldQuery(field, options.requirementsModel);
        const topK = this.normalizeTopK(field.topK) ?? options.defaultTopK;
        const oversample = Math.max(topK * 3, topK + 8);
        const cacheKey = this.buildCacheKey(projectId, query, field.preferredSources, topK, options.minScore);
        const cached = this.getCached(cacheKey);

        if (cached) {
            return {
                fieldId: field.fieldId,
                label: field.label,
                query,
                fromCache: true,
                chunks: cached,
            };
        }

        const embedding = await this.embeddingsClient.embedQuery(query);
        const rows = await this.retrieveHybridSegments({
            projectId,
            query,
            embedding,
            limit: oversample,
        });
        const filteredRows = this.filterByPreferredSources(rows, field.preferredSources)
            .filter((row) => Number(row.similarity) >= options.minScore)
            .slice(0, topK);
        const chunks = filteredRows.map((row) => this.mapRowToChunk(row));
        this.setCache(cacheKey, chunks);

        return {
            fieldId: field.fieldId,
            label: field.label,
            query,
            fromCache: false,
            chunks,
        };
    }

    private async fetchVectorSegments(projectId: string, embedding: number[], limit: number, filters?: { nodeId?: string }): Promise<VectorSegmentRow[]> {
        try {
            const nodeFilter = filters?.nodeId
                ? Prisma.sql`AND ds."nodeId" = ${filters.nodeId}`
                : Prisma.sql``;
            return await this.prisma.$queryRaw<VectorSegmentRow[]>`
                SELECT
                    ds."id" AS "segmentId",
                    ds."content",
                    ds."metadata",
                    ds."nodeId",
                    ds."snapshotId",
                    ds."orderIndex",
                    n."title" AS "nodeTitle",
                    n."type" AS "nodeType",
                    1 - (ds."embedding" <=> ${embedding}::vector) AS "vectorScore"
                FROM "DocumentSegment" ds
                JOIN "Node" n ON n."id" = ds."nodeId"
                WHERE n."projectId" = ${projectId}
                  AND ds."embedding" IS NOT NULL
                  ${nodeFilter}
                ORDER BY "vectorScore" DESC
                LIMIT ${limit};
            `;
        } catch (error) {
            this.logger.error(`RAG query failed for project ${projectId}`, error?.stack || error?.message);
            return [];
        }
    }

    private async fetchLexicalSegments(projectId: string, query: string, limit: number, filters?: { nodeId?: string }): Promise<LexicalSegmentRow[]> {
        if (!this.lexicalEnabled) {
            return [];
        }

        try {
            const nodeFilter = filters?.nodeId
                ? Prisma.sql`AND ds."nodeId" = ${filters.nodeId}`
                : Prisma.sql``;
            const regConfig = this.regconfigExpression();
            return await this.prisma.$queryRaw<LexicalSegmentRow[]>`
                SELECT
                    ds."id" AS "segmentId",
                    ds."content",
                    ds."metadata",
                    ds."nodeId",
                    ds."snapshotId",
                    ds."orderIndex",
                    n."title" AS "nodeTitle",
                    n."type" AS "nodeType",
                    ts_rank_cd(
                        to_tsvector(${regConfig}, coalesce(ds."content", '')),
                        plainto_tsquery(${regConfig}, ${query})
                    ) AS "lexicalScore"
                FROM "DocumentSegment" ds
                JOIN "Node" n ON n."id" = ds."nodeId"
                WHERE n."projectId" = ${projectId}
                  ${nodeFilter}
                  AND to_tsvector(${regConfig}, coalesce(ds."content", '')) @@ plainto_tsquery(${regConfig}, ${query})
                ORDER BY "lexicalScore" DESC
                LIMIT ${limit};
            `;
        } catch (error) {
            this.logger.error(`Lexical RAG query failed for project ${projectId}`, error?.stack || error?.message);
            return [];
        }
    }

    private async retrieveHybridSegments(params: { projectId: string; query: string; embedding: number[]; limit: number; filters?: { nodeId?: string } }) {
        const [vectorRows, lexicalRows] = await Promise.all([
            this.fetchVectorSegments(params.projectId, params.embedding, params.limit, params.filters),
            this.fetchLexicalSegments(params.projectId, params.query, params.limit, params.filters),
        ]);

        return this.combineHybridRows(vectorRows, lexicalRows, params.limit);
    }

    private combineHybridRows(vectorRows: VectorSegmentRow[], lexicalRows: LexicalSegmentRow[], limit?: number): HybridSegmentRow[] {
        const results = new Map<string, HybridSegmentRow>();
        const lexicalMax = lexicalRows.reduce((max, row) => Math.max(max, row.lexicalScore ?? 0), 0);
        const lexicalDivisor = lexicalMax > 0 ? lexicalMax : 1;

        for (const row of vectorRows) {
            const normalizedVector = this.clampScore(row.vectorScore ?? 0);
            results.set(row.segmentId, {
                ...row,
                vectorScore: normalizedVector,
                lexicalScore: results.get(row.segmentId)?.lexicalScore ?? 0,
                similarity: normalizedVector,
            });
        }

        if (this.lexicalEnabled) {
            for (const row of lexicalRows) {
                const normalizedLexical = this.clampScore((row.lexicalScore ?? 0) / lexicalDivisor);
                const existing = results.get(row.segmentId);
                if (existing) {
                    existing.lexicalScore = normalizedLexical;
                } else {
                    results.set(row.segmentId, {
                        ...row,
                        lexicalScore: normalizedLexical,
                        vectorScore: 0,
                        similarity: normalizedLexical,
                    });
                }
            }
        }

        let vectorWeight = Math.max(0, this.vectorWeight);
        let lexicalWeight = this.lexicalEnabled ? Math.max(0, this.lexicalWeight) : 0;
        if (vectorWeight === 0 && lexicalWeight === 0) {
            vectorWeight = 1;
        }
        const weightSum = vectorWeight + lexicalWeight;

        const combined = Array.from(results.values()).map((row) => {
            const finalScore =
                (vectorWeight * (row.vectorScore ?? 0) + lexicalWeight * (row.lexicalScore ?? 0)) /
                weightSum;
            return {
                ...row,
                similarity: this.clampScore(finalScore),
            };
        });

        combined.sort((a, b) => Number(b.similarity) - Number(a.similarity));

        return typeof limit === 'number' ? combined.slice(0, limit) : combined;
    }

    private filterByPreferredSources(rows: HybridSegmentRow[], preferred?: string[]) {
        if (!preferred?.length) {
            return rows;
        }
        const normalized = new Set(preferred.map((item) => item.toLowerCase()));

        return rows.filter((row) => {
            const metadata = (row.metadata || {}) as Record<string, any>;
            const source = (metadata?.sourceType || metadata?.source_type || metadata?.source)?.toString().toLowerCase();
            return source ? normalized.has(source) : false;
        });
    }

    private mapRowToChunk(row: HybridSegmentRow): RagChunkResult {
        const metadata = (row.metadata || {}) as Record<string, any>;
        return {
            segmentId: row.segmentId,
            nodeId: row.nodeId,
            nodeTitle: row.nodeTitle,
            nodeType: row.nodeType,
            snapshotId: row.snapshotId,
            content: row.content,
            similarity: Number(row.similarity ?? 0),
            orderIndex: row.orderIndex,
            sourceType: metadata?.sourceType || metadata?.source_type,
            sourceId: metadata?.sourceId || metadata?.source_id,
            metadata,
        };
    }

    private normalizeScore(score?: number) {
        if (typeof score !== 'number' || Number.isNaN(score)) {
            return 0.5;
        }
        return Math.min(0.99, Math.max(0.1, score));
    }

    private normalizeTopK(topK?: number) {
        if (typeof topK !== 'number' || topK <= 0) {
            return undefined;
        }
        return Math.min(this.maxTopK, Math.max(1, Math.floor(topK)));
    }

    private buildFieldQuery(field: RagFieldQueryDto, requirementsModel?: Record<string, any>) {
        const base = field.query?.trim() || field.label;
        const requirement = this.extractRequirementContext(field.fieldId, requirementsModel);

        return [base, requirement].filter(Boolean).join(' ');
    }

    private extractRequirementContext(fieldId: string, requirementsModel?: Record<string, any>) {
        if (!requirementsModel) {
            return '';
        }

        const lowerId = fieldId.toLowerCase();
        const requirements = Array.isArray(requirementsModel.requiredFields)
            ? requirementsModel.requiredFields
            : [];

        const matchedField = requirements.find((field: any) => {
            const candidates = [field.path, field.field, field.templateCode, field.code]
                .filter(Boolean)
                .map((value) => value.toString().toLowerCase());
            return candidates.some((value) => value.includes(lowerId));
        });

        const factsSnapshot = requirementsModel.factsSnapshot && typeof requirementsModel.factsSnapshot === 'object'
            ? requirementsModel.factsSnapshot
            : {};
        const factValues = Object.entries(factsSnapshot)
            .filter(([key]) => key.toLowerCase().includes(lowerId))
            .map(([, value]) => value);

        const parts: string[] = [];
        if (matchedField?.description) {
            parts.push(`Requirement: ${matchedField.description}`);
        }
        if (matchedField?.severity) {
            parts.push(`Severity: ${matchedField.severity}`);
        }
        if (matchedField?.templateCode) {
            parts.push(`Template: ${matchedField.templateCode}`);
        }
        if (factValues.length) {
            parts.push(`Facts: ${factValues.join(', ')}`);
        }

        return parts.join(' ');
    }

    private buildCacheKey(projectId: string, query: string, preferred?: string[], topK?: number, minScore?: number) {
        const keyPayload = JSON.stringify({
            projectId,
            query,
            preferred: (preferred || []).slice().sort(),
            topK,
            minScore,
        });
        return createHash('sha1').update(keyPayload).digest('hex');
    }

    private getCached(key: string) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    private setCache(key: string, value: RagChunkResult[]) {
        if (this.cacheTtlMs <= 0) {
            return;
        }
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.cacheTtlMs,
        });
    }

    async searchProjectSegments(options: { projectId: string; query: string; limit?: number; nodeId?: string }) {
        const trimmedQuery = options.query?.trim();
        if (!trimmedQuery) {
            return [];
        }

        const limit = Math.min(options.limit ?? this.defaultTopK, this.maxTopK);
        const embedding = await this.embeddingsClient.embedQuery(trimmedQuery);
        const rows = await this.retrieveHybridSegments({
            projectId: options.projectId,
            query: trimmedQuery,
            embedding,
            limit,
            filters: { nodeId: options.nodeId },
        });
        return rows.slice(0, limit).map((row) => this.mapRowToChunk(row));
    }

    private normalizeWeight(rawValue: string | undefined, fallback: number) {
        const parsed = Number(rawValue);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
        return fallback;
    }

    private normalizeRegconfig(rawValue?: string) {
        const fallback = 'simple';
        if (!rawValue) {
            return fallback;
        }
        const sanitized = rawValue.toLowerCase().replace(/[^a-z0-9_]/g, '');
        return sanitized || fallback;
    }

    private regconfigExpression() {
        return Prisma.raw(`'${this.fullTextConfig}'::regconfig`);
    }

    private clampScore(value?: number) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            return 0;
        }
        if (value < 0) {
            return 0;
        }
        if (value > 1) {
            return 1;
        }
        return value;
    }
}
