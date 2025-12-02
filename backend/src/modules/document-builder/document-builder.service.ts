import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GenerationSnapshot, NodeStatus, NodeRevisionChangeType, NodeRevisionSeverity, Prisma, RequirementsModel } from '@prisma/client';
import * as crypto from 'crypto';

import { PrismaService } from '@/prisma.service';
import { RagService, RagFieldResult } from '@/modules/rag/rag.service';

type TemplateField = {
    id: string;
    label?: string;
    type?: string;
    required?: boolean;
    autoFilled?: boolean;
    userOnly?: boolean;
    description?: string;
    placeholder?: string;
    preferredSources?: string[];
    topK?: number;
    [key: string]: any;
};

type TemplateSection = {
    id: string;
    title?: string;
    fields?: TemplateField[];
};

interface FieldResult {
    fieldId: string;
    label?: string;
    value?: string | number | null;
    status: 'AUTO' | 'NEEDS_INPUT';
    notes?: string | null;
    sourceChunkIds: string[];
    ragSources: Array<{
        segmentId: string;
        content: string;
        similarity: number;
        metadata?: Record<string, any>;
    }>;
}

interface SectionResult {
    id: string;
    title?: string;
    fields: FieldResult[];
}

export interface DocumentBuilderSummary {
    nodeId: string;
    snapshotId: string;
    sections: SectionResult[];
    autoFilledFields: string[];
    fieldsNeedingUserInput: string[];
    notesForUser: string[];
}

@Injectable()
export class DocumentBuilderService {
    private readonly logger = new Logger(DocumentBuilderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ragService: RagService,
    ) { }

    async generateNode(nodeId: string): Promise<DocumentBuilderSummary> {
        const node = await this.prisma.node.findUnique({
            where: { id: nodeId },
            include: {
                project: true,
            },
        });

        if (!node) {
            throw new NotFoundException('Node not found');
        }

        if (!node.templateCode) {
            throw new BadRequestException('Node missing templateCode');
        }

        const template = await this.prisma.documentTemplate.findFirst({
            where: {
                code: node.templateCode,
                ...(node.templateVersion ? { version: node.templateVersion } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!template) {
            throw new BadRequestException(`Template ${node.templateCode} not found`);
        }

        const templateSchema = this.parseTemplate(template.schema);
        if (!templateSchema.sections?.length) {
            throw new BadRequestException('Template schema missing sections');
        }

        const requirements = await this.prisma.requirementsModel.findFirst({
            where: { projectId: node.projectId },
            orderBy: { createdAt: 'desc' },
            include: { ruleEvaluation: true },
        });

        const facts = this.mergeFacts(node, node.project);
        const requirementFieldMap = this.buildRequirementMap(requirements);

        const { fieldStates, ragRequests } = this.prepareFieldStates(
            templateSchema.sections,
            node.data,
            facts,
            requirementFieldMap,
        );

        const ragSourcesMap = await this.fetchRagContext(
            node.projectId,
            ragRequests,
            requirements,
        );

        const sectionsResult: SectionResult[] = [];
        const autoFilledFields: string[] = [];
        const needsInputFields: string[] = [];
        const notesForUser: string[] = [];
        const ragContextMap = new Map<string, FieldResult['ragSources']>();

        for (const section of templateSchema.sections) {
            const fields: FieldResult[] = [];

            for (const field of section.fields ?? []) {
                const fieldKey = this.buildFieldKey(section.id, field.id);
                const base = fieldStates.get(fieldKey);
                let value = base?.value ?? null;
                const ragSources = ragSourcesMap.get(fieldKey) ?? [];

                if (!value && ragSources.length) {
                    value = this.composeValueFromRag(ragSources);
                }

                const status: FieldResult['status'] = value ? 'AUTO' : 'NEEDS_INPUT';
                if (status === 'AUTO') {
                    autoFilledFields.push(field.id);
                } else if (field.required) {
                    needsInputFields.push(field.id);
                }

                const notes = !value && field.required
                    ? `Trenger menneskelig input for felt "${field.label || field.id}"`
                    : null;
                if (notes) {
                    notesForUser.push(notes);
                }

                const fieldResult: FieldResult = {
                    fieldId: field.id,
                    label: field.label,
                    value: value ?? null,
                    status,
                    notes,
                    sourceChunkIds: ragSources.map((source) => source.segmentId),
                    ragSources,
                };
                fields.push(fieldResult);
                ragContextMap.set(fieldKey, ragSources);
            }

            sectionsResult.push({
                id: section.id,
                title: section.title,
                fields,
            });
        }

        const summary = await this.writeGeneration({
            node,
            template,
            sections: sectionsResult,
            autoFilledFields,
            needsInputFields,
            notesForUser,
            requirements,
            ragContextMap,
        });

        return summary;
    }

    private parseTemplate(schema: Prisma.JsonValue): { sections: TemplateSection[] } {
        if (!schema) {
            return { sections: [] };
        }
        if (typeof schema === 'object' && schema !== null) {
            const typed = schema as { sections?: TemplateSection[] };
            return {
                sections: typed.sections ?? [],
            };
        }
        try {
            return JSON.parse(String(schema));
        } catch {
            return { sections: [] };
        }
    }

    private mergeFacts(
        node: Prisma.NodeGetPayload<{ include: { project: true } }>,
        project?: Prisma.ProjectGetPayload<{}>,
    ) {
        return {
            ...(project?.facts as Record<string, any> | undefined),
            ...(node.facts as Record<string, any> | undefined),
        };
    }

    private buildRequirementMap(requirements?: RequirementsModel | null) {
        const map = new Map<string, any>();
        const payload = requirements?.payload as Record<string, any> | undefined;
        const fields = payload?.requiredFields;
        if (Array.isArray(fields)) {
            for (const entry of fields) {
                if (entry?.path) {
                    map.set(entry.path, entry);
                } else if (entry?.field) {
                    map.set(entry.field, entry);
                }
            }
        }
        return map;
    }

    private pickFieldValue(
        field: TemplateField,
        nodeData: Prisma.JsonValue | null | undefined,
        facts: Record<string, any>,
        requirementFieldMap: Map<string, any>,
    ) {
        const sections = this.toSectionArray(nodeData);
        const existing = this.extractFieldFromSections(sections, field.id);
        if (existing !== undefined && existing !== null && existing !== '') {
            return existing;
        }

        const factValue = facts?.[field.id];
        if (factValue !== undefined && factValue !== null && factValue !== '') {
            return factValue;
        }

        const requirement = requirementFieldMap.get(field.id);
        if (requirement?.data?.default) {
            return requirement.data.default;
        }

        return null;
    }

    private toSectionArray(nodeData: Prisma.JsonValue | null | undefined) {
        if (!nodeData || typeof nodeData !== 'object') {
            return [];
        }
        const value = nodeData as Record<string, any>;
        if (Array.isArray(value.sections)) {
            return value.sections;
        }
        return [];
    }

    private extractFieldFromSections(sections: any[], fieldId: string) {
        for (const section of sections) {
            for (const field of section?.fields ?? []) {
                if (field.fieldId === fieldId || field.id === fieldId) {
                    return field.value;
                }
            }
        }
        return undefined;
    }

    private composeValueFromRag(ragSources: FieldResult['ragSources']) {
        if (!ragSources.length) {
            return null;
        }
        return ragSources
            .map((source) => source.content.trim())
            .filter(Boolean)
            .join('\n\n');
    }

    private async writeGeneration(params: {
        node: Prisma.NodeGetPayload<{ include: { project: true } }>;
        template: Prisma.DocumentTemplateGetPayload<{}>;
        sections: SectionResult[];
        autoFilledFields: string[];
        needsInputFields: string[];
        notesForUser: string[];
        requirements?: (RequirementsModel & { ruleEvaluation?: { id: string } | null }) | null;
        ragContextMap: Map<string, FieldResult['ragSources']>;
    }): Promise<DocumentBuilderSummary> {
        const { node, sections, autoFilledFields, needsInputFields, notesForUser } = params;

        const builderPayload = {
            sections: sections.map((section) => ({
                id: section.id,
                title: section.title,
                fields: section.fields.map((field) => ({
                    fieldId: field.fieldId,
                    label: field.label,
                    value: field.value,
                    status: field.status,
                    notes: field.notes,
                    sourceChunkIds: field.sourceChunkIds,
                })),
            })),
            autoFilledFields,
            fieldsNeedingUserInput: needsInputFields,
            notesForUser,
        };

        const ragContext: Record<string, any> = {};
        for (const [key, sources] of params.ragContextMap.entries()) {
            ragContext[key] = sources;
        }

        const snapshotPayload = {
            builder: builderPayload,
            template: {
                code: params.template.code,
                version: params.template.version,
            },
            requirementsModelId: params.requirements?.id,
            ragContext,
        };

        const summaryText = this.buildSummary(autoFilledFields, needsInputFields);

        const result = await this.prisma.$transaction(async (tx) => {
            const lastRevision = await tx.nodeRevision.findFirst({
                where: { nodeId: node.id },
                orderBy: { revisionNumber: 'desc' },
                select: { revisionNumber: true },
            });
            const nextRevisionNumber = (lastRevision?.revisionNumber ?? 0) + 1;

            const revision = await tx.nodeRevision.create({
                data: {
                    nodeId: node.id,
                    revisionNumber: nextRevisionNumber,
                    changeType: NodeRevisionChangeType.AI_GENERATION,
                    severity: needsInputFields.length > 0 ? NodeRevisionSeverity.NOTE : NodeRevisionSeverity.NONE,
                    summary: summaryText,
                    payload: builderPayload as Prisma.JsonValue,
                    // @ts-ignore
                    previousData: node.data ?? Prisma.DbNull,
                    // @ts-ignore
                    newData: builderPayload as Prisma.JsonValue,
                },
            });

            const snapshot = await tx.generationSnapshot.create({
                data: {
                    nodeId: node.id,
                    nodeRevisionId: revision.id,
                    snapshotType: 'DOCUMENT',
                    payload: snapshotPayload as Prisma.JsonValue,
                    ruleSetHash: this.computeRuleSetHash(params.requirements),
                },
            });

            let orderIndex = 0;
            for (const section of sections) {
                for (const field of section.fields) {
                    if (!field.value) {
                        continue;
                    }

                    const segment = await tx.documentSegment.create({
                        data: {
                            nodeId: node.id,
                            snapshotId: snapshot.id,
                            nodeRevisionId: revision.id,
                            orderIndex: orderIndex++,
                            segmentType: `FIELD:${field.fieldId}`,
                            content: String(field.value),
                            metadata: {
                                sectionId: section.id,
                                sectionTitle: section.title,
                                fieldId: field.fieldId,
                                label: field.label,
                                status: field.status,
                            },
                        },
                    });

                    for (const source of field.ragSources) {
                        await tx.documentSegmentProvenance.create({
                            data: {
                                segmentId: segment.id,
                                sourceType: source.metadata?.sourceType ?? 'FILE',
                                sourceId: source.metadata?.fileId ?? null,
                                score: source.similarity,
                                metadata: source.metadata as Prisma.JsonValue,
                            },
                        });
                    }
                }
            }

            await tx.node.update({
                where: { id: node.id },
                data: {
                    data: builderPayload as Prisma.JsonValue,
                    status: NodeStatus.PENDING_REVIEW,
                    currentRevisionId: revision.id,
                    metadata: this.withLastBuilderRun(node.metadata, snapshot),
                },
            });

            return {
                nodeId: node.id,
                snapshotId: snapshot.id,
            };
        });

        return {
            nodeId: result.nodeId,
            snapshotId: result.snapshotId,
            sections,
            autoFilledFields,
            fieldsNeedingUserInput: needsInputFields,
            notesForUser,
        };
    }

    private computeRuleSetHash(requirements?: RequirementsModel | null) {
        if (!requirements) {
            return null;
        }
        const payload = JSON.stringify({
            id: requirements.id,
            scope: requirements.scope,
            version: requirements.version,
            metadata: requirements.metadata ?? {},
            ruleEvaluationId: requirements.ruleEvaluationId,
        });
        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    private buildSummary(autoFilled: string[], needsInput: string[]) {
        const parts = [];
        parts.push(`Fylte automatisk ${autoFilled.length} felt`);
        if (needsInput.length) {
            parts.push(`${needsInput.length} felter krever brukerinput`);
        }
        return parts.join('. ');
    }

    private withLastBuilderRun(metadata: Prisma.JsonValue | null | undefined, snapshot: GenerationSnapshot) {
        const meta = (typeof metadata === 'object' && metadata !== null) ? { ...(metadata as Record<string, any>) } : {};
        meta.lastBuilderRun = {
            snapshotId: snapshot.id,
            generatedAt: snapshot.createdAt,
        };
        return meta as Prisma.JsonValue;
    }
    private buildFieldKey(sectionId: string, fieldId: string) {
        return `${sectionId}::${fieldId}`;
    }

    private shouldAutoFillField(field: TemplateField) {
        return field.autoFilled !== false && !field.userOnly;
    }

    private prepareFieldStates(
        sections: TemplateSection[],
        nodeData: Prisma.JsonValue | null | undefined,
        facts: Record<string, any>,
        requirementFieldMap: Map<string, any>,
    ) {
        const fieldStates = new Map<string, { value: any }>();
        const ragRequests: Array<{ key: string; field: TemplateField; query: string }> = [];

        for (const section of sections) {
            for (const field of section.fields ?? []) {
                const fieldKey = this.buildFieldKey(section.id, field.id);
                const value = this.pickFieldValue(field, nodeData, facts, requirementFieldMap);
                fieldStates.set(fieldKey, { value });

                if (!value && this.shouldAutoFillField(field)) {
                    ragRequests.push({
                        key: fieldKey,
                        field,
                        query: this.buildFieldQuery(field, section),
                    });
                }
            }
        }

        return { fieldStates, ragRequests };
    }

    private buildFieldQuery(field: TemplateField, section: TemplateSection) {
        const hints = [
            field.label,
            field.description,
            field.placeholder,
            field.type,
            section.title,
            field.id,
        ];
        return hints.filter(Boolean).join(' ');
    }

    private async fetchRagContext(
        projectId: string,
        pendingFields: Array<{ key: string; field: TemplateField; query: string }>,
        requirements?: (RequirementsModel & { ruleEvaluation?: { id: string } | null }) | null,
    ) {
        if (!pendingFields.length) {
            return new Map<string, FieldResult['ragSources']>();
        }

        try {
            const response = await this.ragService.getProjectContext({
                projectId,
                requirementsModel: (requirements?.payload as Record<string, any>) ?? undefined,
                defaultTopK: 3,
                fields: pendingFields.map((field) => ({
                    fieldId: field.key,
                    label: field.field.label || field.field.id,
                    query: field.query || field.field.id,
                    preferredSources: field.field.preferredSources,
                    topK: field.field.topK,
                })),
            });

            return this.mapRagResponse(response.fields);
        } catch (error) {
            this.logger.warn(`RAG context failed for project ${projectId}: ${error.message}`);
            return new Map<string, FieldResult['ragSources']>();
        }
    }

    private mapRagResponse(fields: RagFieldResult[]) {
        const map = new Map<string, FieldResult['ragSources']>();

        for (const field of fields) {
            const sources =
                field.chunks?.map((chunk) => ({
                    segmentId: chunk.segmentId,
                    content: chunk.content,
                    similarity: chunk.similarity,
                    metadata: chunk.metadata ?? {},
                })) ?? [];

            map.set(field.fieldId, sources);
        }

        return map;
    }
}
