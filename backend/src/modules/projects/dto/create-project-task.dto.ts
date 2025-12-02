export class CreateProjectTaskDto {
    title: string;
    description?: string;
    flowType?: string;
    status?: string;
    dueAt?: string;
    documentId?: string;
    metadata?: Record<string, any>;
}
