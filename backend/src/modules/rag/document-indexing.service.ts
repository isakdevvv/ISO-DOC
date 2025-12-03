import { Injectable, Logger } from '@nestjs/common';
import { IngestionMode, LegalClass, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { DocumentProcessingService } from '@/common/processing/document-processing.service';
import { AiClientFactory } from '@/common/ai/ai-client.factory';
import { PrismaService } from '@/prisma.service';

interface IndexPlainTextParams {
    fileId: string;
    fileName: string;
    nodeId?: string | null;
    projectId?: string | null;
    tenantId: string;
    variantId: string;
    text: string;
}

@Injectable()
export class DocumentIndexingService {
    private readonly logger = new Logger(DocumentIndexingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly documentProcessing: DocumentProcessingService,
        private readonly aiClientFactory: AiClientFactory,
    ) { }

    async indexPlainTextVariant(params: IndexPlainTextParams) {
        if (!params.nodeId) {
            this.logger.debug(`Skipping indexing for file ${params.fileId} because it is not linked to a node`);
            return;
        }

        const classification = await this.prisma.file.findUnique({
            where: { id: params.fileId },
            select: { legalClass: true, ingestionMode: true },
        });
        if (!classification) {
            this.logger.warn(`Skipping indexing for file ${params.fileId} because record was not found`);
            return;
        }

        const trimmed = params.text?.trim();
        if (!trimmed) {
            this.logger.debug(`Skipping indexing for file ${params.fileId} because no text was extracted`);
            return;
        }

        const chunks = await this.documentProcessing.chunkText(trimmed, {
            chunkSize: 800,
            chunkOverlap: 120,
            keepSeparator: false,
        });

        if (!chunks.length) {
            this.logger.debug(`No chunks produced for file ${params.fileId}`);
            return;
        }

        const contents = chunks
            .map((chunk) => chunk.pageContent.trim())
            .filter((content) => content.length > 0);

        if (!contents.length) {
            this.logger.debug(`Filtered chunks for file ${params.fileId} removed all content`);
            return;
        }

        await this.deleteExistingSegments(params.variantId);

        try {
            const embeddingsClient = this.aiClientFactory.getEmbeddings();
            const vectors = await embeddingsClient.embedDocuments(contents);

            await this.createSegments({
                nodeId: params.nodeId,
                variantId: params.variantId,
                fileId: params.fileId,
                fileName: params.fileName,
                projectId: params.projectId,
                tenantId: params.tenantId,
                legalClass: classification.legalClass,
                ingestionMode: classification.ingestionMode,
                contents,
                vectors,
            });
        } catch (error) {
            this.logger.error(`Failed to embed chunks for ${params.fileId}: ${error.message}`);
        }
    }

    private async deleteExistingSegments(variantId: string) {
        const existing = await this.prisma.documentSegment.findMany({
            where: {
                metadata: {
                    path: ['fileVariantId'],
                    equals: variantId,
                },
            },
            select: { id: true },
        });

        if (!existing.length) {
            return;
        }

        const ids = existing.map((segment) => segment.id);

        await this.prisma.documentSegmentProvenance.deleteMany({
            where: { segmentId: { in: ids } },
        });
        await this.prisma.documentSegment.deleteMany({
            where: { id: { in: ids } },
        });
    }

    private async createSegments(params: {
        nodeId: string;
        variantId: string;
        fileId: string;
        fileName: string;
        projectId?: string | null;
        tenantId: string;
        legalClass: LegalClass;
        ingestionMode: IngestionMode;
        contents: string[];
        vectors: number[][];
    }) {
        const baseMetadata = {
            fileId: params.fileId,
            fileVariantId: params.variantId,
            fileName: params.fileName,
            projectId: params.projectId,
            tenantId: params.tenantId,
            legalClass: params.legalClass,
            ingestionMode: params.ingestionMode,
        };

        for (let index = 0; index < params.contents.length; index++) {
            const content = params.contents[index];
            const embedding = params.vectors[index];
            if (!embedding?.length) {
                continue;
            }

            const id = randomUUID();
            const metadata = {
                ...baseMetadata,
                chunkIndex: index,
                charCount: content.length,
            };

            await this.prisma.$executeRaw`
                INSERT INTO "DocumentSegment" (
                    "id",
                    "nodeId",
                    "orderIndex",
                    "segmentType",
                    "content",
                    "metadata",
                    "embedding",
                    "createdAt"
                ) VALUES (
                    ${id},
                    ${params.nodeId},
                    ${index},
                    ${'FILE_CHUNK'},
                    ${content},
                    ${metadata},
                    ${this.toVectorLiteral(embedding)},
                    NOW()
                )
            `;
        }
    }

    private toVectorLiteral(values: number[]) {
        const literal = `[${values.join(',')}]`;
        return Prisma.raw(`'${literal}'::vector`);
    }
}
