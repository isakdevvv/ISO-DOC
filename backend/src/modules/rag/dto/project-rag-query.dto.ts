import { IngestionMode, LegalClass } from '@prisma/client';

export interface RagFieldQueryDto {
    fieldId: string;
    label: string;
    query?: string;
    preferredSources?: string[];
    topK?: number;
}

export interface ProjectRagQueryDto {
    projectId: string;
    fields: RagFieldQueryDto[];
    requirementsModel?: Record<string, any>;
    defaultTopK?: number;
    minScore?: number;
    allowedLegalClasses?: LegalClass[];
    allowedIngestionModes?: IngestionMode[];
}
