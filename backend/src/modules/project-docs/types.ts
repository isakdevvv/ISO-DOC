import { GeneratedFileSource, GeneratedFileType } from '@prisma/client';

export type TemplateGenerationMode = 'AI' | 'TEMPLATE_ONLY';

export interface TemplateFileDefinition {
    fileName: string;
    fileType: GeneratedFileType;
    description?: string;
    generation?: {
        mode: TemplateGenerationMode;
        templateId: string;
    };
}

export interface TemplateFolderDefinition {
    name: string;
    description?: string;
    files?: TemplateFileDefinition[];
    children?: TemplateFolderDefinition[];
}

export interface FolderTemplateConfig {
    folderTemplateVersion: string;
    rootNamingPattern: string;
    folders: TemplateFolderDefinition[];
}

export interface FolderNodeFile {
    id?: string;
    relativePath: string;
    fileType: GeneratedFileType;
    source: GeneratedFileSource;
    description?: string | null;
    createdAt?: string;
    storagePath?: string;
    status: 'GENERATED' | 'PENDING';
    generation?: TemplateFileDefinition['generation'];
}

export interface FolderNode {
    name: string;
    path: string;
    description?: string;
    children: FolderNode[];
    files: FolderNodeFile[];
}
