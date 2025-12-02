export class CreateTemplateDto {
    code: string;
    title: string;
    version: string;
    description?: string;
    schema: Record<string, any>;
    metadata?: Record<string, any>;
}
