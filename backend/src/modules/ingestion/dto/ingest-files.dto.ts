import { IngestionMode, LegalClass } from '@prisma/client';

export class IngestFilesDto {
    tenantId?: string;
    projectId?: string;
    nodeId?: string;
    source?: string;
    legalClass?: LegalClass;
    ingestionMode?: IngestionMode;
}
