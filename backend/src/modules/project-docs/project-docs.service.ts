import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
    AttachmentCategory,
    DocumentationAttachment,
    DocumentationGeneratedFile,
    GeneratedFileSource,
    GeneratedFileType,
    Project,
} from '@prisma/client';

import { PrismaService } from '@/prisma.service';
import { AiClientFactory } from '@/common/ai/ai-client.factory';
import { markdownToDocxBuffer } from './utils/docx-writer';
import { buildXlsxTemplate } from './utils/xlsx-templates';
import { GenerateProjectStructureDto } from './dto/generate-project-structure.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { FolderNode, FolderNodeFile, FolderTemplateConfig, TemplateFolderDefinition, TemplateFileDefinition } from './types';

interface AuthContext {
    tenantId?: string;
}

@Injectable()
export class ProjectDocsService {
    private readonly logger = new Logger(ProjectDocsService.name);
    private readonly storageRoot = process.env.PROJECT_DOC_STORAGE || path.resolve(process.cwd(), 'uploads/project-docs');
    private readonly templateConfig: FolderTemplateConfig;

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiClientFactory: AiClientFactory,
    ) {
        this.templateConfig = this.loadTemplateConfig();
        fs.mkdir(this.storageRoot, { recursive: true }).catch((err) => {
            this.logger.error(`Failed to ensure storage root: ${err.message}`);
        });
    }

    async uploadAttachment(projectId: string, dto: UploadAttachmentDto, file: Express.Multer.File, auth: AuthContext) {
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const project = await this.ensureProject(projectId, auth.tenantId);
        const rootInfo = await this.ensureProjectRoot(project);
        const attachmentsDir = path.join(rootInfo.absolutePath, 'attachments');
        await fs.mkdir(attachmentsDir, { recursive: true });
        const safeName = this.sanitizeSegment(file.originalname || 'upload.bin');
        const storedFileName = `${Date.now()}_${safeName}`;
        const relativeStoredPath = path.posix.join('attachments', storedFileName);
        const absolutePath = path.join(rootInfo.absolutePath, 'attachments', storedFileName);
        await fs.writeFile(absolutePath, file.buffer);

        const record = await this.prisma.documentationAttachment.create({
            data: {
                projectId: project.id,
                originalFileName: file.originalname,
                storedPath: path.posix.join(rootInfo.rootFolder, relativeStoredPath),
                category: dto.category,
                description: dto.description ?? null,
            },
        });

        this.logger.log(`project=${project.id} attachment=${record.id} stored=${relativeStoredPath}`);
        return this.toAttachmentResponse(record);
    }

    async generateStructure(projectId: string, dto: GenerateProjectStructureDto, auth: AuthContext) {
        const project = await this.ensureProject(projectId, auth.tenantId);
        if (dto.createPhysicalFolders || dto.generateChecklists || dto.generateInternkontroll) {
            this.ensureProjectMeta(project);
        }
        const tree = this.buildFolderTree(project);
        if (dto.createPhysicalFolders) {
            await this.createPhysicalFolders(project, tree);
        }
        if (dto.generateChecklists) {
            await this.generateTemplateOnlyFiles(project, tree);
        }
        if (dto.generateInternkontroll) {
            await this.generateAiDocuments(project, tree);
        }
        await this.hydrateTreeWithGeneratedFiles(project, tree);
        await this.injectAttachments(project, tree);
        return tree;
    }

    async regenerateInternkontroll(projectId: string, auth: AuthContext) {
        const project = await this.ensureProject(projectId, auth.tenantId);
        this.ensureProjectMeta(project);
        const tree = this.buildFolderTree(project);
        await this.generateAiDocuments(project, tree, { force: true, templateIds: ['internkontroll_main'] });
        await this.hydrateTreeWithGeneratedFiles(project, tree);
        await this.injectAttachments(project, tree);
        return tree;
    }

    async getFolderTree(projectId: string, auth: AuthContext) {
        const project = await this.ensureProject(projectId, auth.tenantId);
        const tree = this.buildFolderTree(project);
        await this.hydrateTreeWithGeneratedFiles(project, tree);
        await this.injectAttachments(project, tree);
        return tree;
    }

    private loadTemplateConfig(): FolderTemplateConfig {
        const candidates = [
            path.resolve(__dirname, 'templates', 'folder-template.json'),
            path.resolve(process.cwd(), 'src/modules/project-docs/templates/folder-template.json'),
        ];
        for (const candidate of candidates) {
            try {
                const raw = fsSync.readFileSync(candidate, 'utf-8');
                return JSON.parse(raw) as FolderTemplateConfig;
            } catch (error) {
                continue;
            }
        }
        throw new Error('folder-template.json missing');
    }

    private async ensureProject(projectId: string, tenantId?: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new NotFoundException('Project not found');
        }
        if (tenantId && project.tenantId !== tenantId) {
            throw new NotFoundException('Project not found');
        }
        return project;
    }

    private ensureProjectMeta(project: Project) {
        const required: Array<{ key: keyof Project; label: string }> = [
            { key: 'projectNumber', label: 'projectNumber' },
            { key: 'siteName', label: 'siteName' },
            { key: 'clientName', label: 'customerName' },
            { key: 'siteAddress', label: 'siteAddress' },
            { key: 'orderNumber', label: 'orderNumber' },
            { key: 'installerCompany', label: 'installerCompany' },
            { key: 'projectManager', label: 'projectManager' },
            { key: 'medium', label: 'medium' },
        ];
        const missing = required
            .filter(({ key }) => {
                const value = project[key];
                return value === null || value === undefined || value === '';
            })
            .map(({ label }) => label);
        if (!project.commissionedAt) {
            missing.push('commissioningDate');
        }
        if (missing.length) {
            throw new BadRequestException({
                message: 'Project is missing required metadata for generation',
                missing,
            });
        }
    }

    private applyPlaceholders(value: string, project: Project) {
        const year = project.commissionedAt ? project.commissionedAt.getFullYear().toString() : `${new Date().getFullYear()}`;
        const replacements: Record<string, string | undefined | null> = {
            PROJECT_NUMBER: project.projectNumber,
            CUSTOMER_NAME: project.clientName,
            SITE_NAME: project.siteName,
            SITE_ADDRESS: project.siteAddress ?? project.address,
            ORDER_NUMBER: project.orderNumber,
            OFFER_NUMBER: project.offerNumber,
            INSTALLER_COMPANY: project.installerCompany,
            PROJECT_MANAGER: project.projectManager,
            MEDIUM: project.medium,
            YEAR: year,
        };

        return value.replace(/\[([A-Z0-9_]+)\]/g, (_, key: string) => {
            const replacement = replacements[key];
            return replacement && replacement.trim().length > 0 ? replacement : `MISSING_${key}`;
        });
    }

    private sanitizeSegment(segment: string) {
        const cleaned = segment.replace(/[\\/:*?"<>|]/g, '_').trim();
        return cleaned.length ? cleaned : 'untitled';
    }

    private buildFolderTree(project: Project): FolderNode {
        const rootDisplay = this.applyPlaceholders(this.templateConfig.rootNamingPattern, project) || project.name;
        const rootNode: FolderNode = {
            name: rootDisplay,
            path: this.sanitizeSegment(rootDisplay),
            description: 'Prosjektmappe',
            files: [],
            children: this.templateConfig.folders.map((folder) => this.buildFolderNode(folder, '', project)),
        };
        return rootNode;
    }

    private buildFolderNode(folder: TemplateFolderDefinition, parentPath: string, project: Project): FolderNode {
        const name = this.applyPlaceholders(folder.name, project);
        const safeName = this.sanitizeSegment(name);
        const relativePath = parentPath ? path.posix.join(parentPath, safeName) : safeName;
        const node: FolderNode = {
            name,
            path: relativePath,
            description: folder.description,
            files: (folder.files ?? []).map((file) => this.buildFileNode(file, relativePath, project)),
            children: (folder.children ?? []).map((child) => this.buildFolderNode(child, relativePath, project)),
        };
        return node;
    }

    private buildFileNode(file: TemplateFileDefinition, folderPath: string, project: Project): FolderNodeFile {
        const name = this.applyPlaceholders(file.fileName, project);
        const safeName = this.sanitizeSegment(name);
        const relativePath = folderPath ? path.posix.join(folderPath, safeName) : safeName;
        return {
            relativePath,
            fileType: file.fileType,
            source: file.generation?.mode === 'AI' ? GeneratedFileSource.AI_GENERATED : GeneratedFileSource.COPIED,
            description: file.description ?? null,
            status: 'PENDING',
            generation: file.generation,
        };
    }

    private async ensureProjectRoot(project: Project) {
        const rootName = this.applyPlaceholders(this.templateConfig.rootNamingPattern, project) || project.name;
        const safeRoot = this.sanitizeSegment(rootName);
        const absolutePath = path.join(this.storageRoot, safeRoot);
        await fs.mkdir(absolutePath, { recursive: true });
        return { rootFolder: safeRoot, absolutePath };
    }

    private async createPhysicalFolders(project: Project, tree: FolderNode) {
        const rootInfo = await this.ensureProjectRoot(project);
        const createRecursive = async (node: FolderNode, skipCurrent = false) => {
            if (!skipCurrent && node.path) {
                const targetPath = path.join(rootInfo.absolutePath, ...node.path.split('/'));
                await fs.mkdir(targetPath, { recursive: true });
            }
            await Promise.all(node.children.map((child) => createRecursive(child)));
        };
        await createRecursive(tree, true);
        this.logger.log(`project=${project.id} folders ensured at ${rootInfo.absolutePath}`);
    }

    private async generateTemplateOnlyFiles(project: Project, tree: FolderNode) {
        const files = this.collectFiles(tree).filter((file) => file.generation?.mode === 'TEMPLATE_ONLY');
        for (const file of files) {
            await this.createTemplateFile(project, file);
        }
    }

    private async createTemplateFile(project: Project, file: FolderNodeFile) {
        if (!file.generation?.templateId) {
            return;
        }
        const existing = await this.findGeneratedFile(project.id, file.relativePath);
        if (existing) {
            return existing;
        }
        let buffer: Buffer;
        if (file.fileType === GeneratedFileType.XLSX) {
            buffer = buildXlsxTemplate(file.generation.templateId, {
                siteName: project.siteName,
                projectNumber: project.projectNumber,
                medium: project.medium,
            });
        } else if (file.fileType === GeneratedFileType.DOCX || file.fileType === GeneratedFileType.MD || file.fileType === GeneratedFileType.TXT) {
            const templateText = this.renderTemplateText(file.generation.templateId, project);
            buffer = file.fileType === GeneratedFileType.DOCX
                ? await markdownToDocxBuffer(templateText)
                : Buffer.from(templateText, 'utf-8');
        } else {
            buffer = Buffer.alloc(0);
        }
        return this.writeGeneratedFile(project, file, buffer, GeneratedFileSource.COPIED);
    }

    private renderTemplateText(templateId: string, project: Project) {
        switch (templateId) {
            case 'action_plan_template':
                return `# Tiltaksplan for ${project.siteName ?? 'anlegg'}\n\n| Tiltak | Beskrivelse | Ansvarlig | Frist | Status |\n| --- | --- | --- | --- | --- |\n| [Fyll inn] | [Beskriv avvik eller forbedring] | [Ansvarlig] | [Dato] | Åpen |`;
            case 'management_review':
                return `# Ledelsens gjennomgang ${new Date().getFullYear()}\n\n- Prosjekt: ${project.siteName ?? project.name}\n- Kunde: ${project.clientName ?? '[Kunde]'}\n- Prosjektleder: ${project.projectManager ?? '[Prosjektleder]'}\n\n## Beslutninger\n[Fyll inn vurderinger, tiltak og neste steg.]`;
            default:
                return `# Dokumentmal\nIngen detaljert mal for ${templateId}.`;
        }
    }

    private async generateAiDocuments(project: Project, tree: FolderNode, opts?: { force?: boolean; templateIds?: string[] }) {
        const files = this.collectFiles(tree).filter((file) => file.generation?.mode === 'AI');
        for (const file of files) {
            const templateId = file.generation?.templateId;
            if (!templateId) {
                continue;
            }
            if (opts?.templateIds && !opts.templateIds.includes(templateId)) {
                continue;
            }
            await this.createAiDocument(project, file, opts?.force ?? false);
        }
    }

    private async createAiDocument(project: Project, file: FolderNodeFile, force: boolean) {
        if (!file.generation?.templateId) {
            return;
        }
        const existing = await this.findGeneratedFile(project.id, file.relativePath);
        if (existing && !force) {
            return existing;
        }
        const prompt = this.loadPrompt(file.generation.templateId);
        const chat = this.aiClientFactory.getChatModel(undefined, 0.2);
        const payload = this.serializeProject(project);
        const attachments = await this.prisma.documentationAttachment.findMany({ where: { projectId: project.id } });
        const userPayload = {
            project: payload,
            attachments: attachments.map((attachment) => ({
                id: attachment.id,
                originalFileName: attachment.originalFileName,
                category: attachment.category,
                description: attachment.description,
            })),
        };
        try {
            const result = await chat.invoke([
                new SystemMessage(prompt),
                new HumanMessage(`Prosjektdata:\n\n${JSON.stringify(userPayload, null, 2)}`),
            ]);
            const content = this.normalizeAiContent(result.content);
            const buffer = file.fileType === GeneratedFileType.DOCX
                ? await markdownToDocxBuffer(content)
                : Buffer.from(content, 'utf-8');
            return this.writeGeneratedFile(project, file, buffer, GeneratedFileSource.AI_GENERATED, force);
        } catch (error) {
            this.logger.error(`AI generation failed for ${file.generation.templateId}: ${error.message}`);
            throw new BadGatewayException('AI generation failed');
        }
    }

    private loadPrompt(templateId: string) {
        const candidates = [
            path.resolve(__dirname, 'prompts', `${templateId}.txt`),
            path.resolve(process.cwd(), 'src/modules/project-docs/prompts', `${templateId}.txt`),
        ];
        for (const candidate of candidates) {
            try {
                return fsSync.readFileSync(candidate, 'utf-8');
            } catch {
                continue;
            }
        }
        return 'You are a helpful assistant that writes Norwegian technical documentation.';
    }

    private normalizeAiContent(content: unknown) {
        const raw = Array.isArray(content) ? content.map((entry) => (typeof entry === 'string' ? entry : '')).join('\n') : String(content ?? '');
        return raw.replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '').trim();
    }

    private serializeProject(project: Project) {
        return {
            id: project.id,
            projectNumber: project.projectNumber,
            customerName: project.clientName,
            siteName: project.siteName,
            siteAddress: project.siteAddress ?? project.address,
            orderNumber: project.orderNumber,
            offerNumber: project.offerNumber,
            installerCompany: project.installerCompany,
            projectManager: project.projectManager,
            commissioningDate: project.commissionedAt?.toISOString(),
            medium: project.medium,
        };
    }

    private async writeGeneratedFile(
        project: Project,
        file: FolderNodeFile,
        buffer: Buffer,
        source: GeneratedFileSource,
        force = false,
    ) {
        const rootInfo = await this.ensureProjectRoot(project);
        const fsRelativePath = path.join(...file.relativePath.split('/'));
        const absolutePath = path.join(rootInfo.absolutePath, fsRelativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, buffer);
        const storedPath = path.posix.join(rootInfo.rootFolder, file.relativePath);
        const mimeType = this.resolveMimeType(file.fileType);

        const record = await this.prisma.documentationGeneratedFile.upsert({
            where: { projectId_relativePath: { projectId: project.id, relativePath: file.relativePath } },
            update: {
                storagePath: storedPath,
                fileType: file.fileType,
                source,
                description: file.description ?? null,
                mimeType,
                ...(force ? { createdAt: new Date() } : {}),
            },
            create: {
                projectId: project.id,
                relativePath: file.relativePath,
                storagePath: storedPath,
                fileType: file.fileType,
                source,
                description: file.description ?? null,
                mimeType,
            },
        });

        this.logger.log(`project=${project.id} generated file=${record.id} path=${storedPath}`);
        return record;
    }

    private resolveMimeType(type: GeneratedFileType) {
        switch (type) {
            case GeneratedFileType.DOCX:
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case GeneratedFileType.PDF:
                return 'application/pdf';
            case GeneratedFileType.MD:
                return 'text/markdown';
            case GeneratedFileType.TXT:
                return 'text/plain';
            case GeneratedFileType.XLSX:
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            default:
                return 'application/octet-stream';
        }
    }

    private collectFiles(node: FolderNode): FolderNodeFile[] {
        return [
            ...node.files,
            ...node.children.flatMap((child) => this.collectFiles(child)),
        ];
    }

    private async hydrateTreeWithGeneratedFiles(project: Project, tree: FolderNode) {
        const records = await this.prisma.documentationGeneratedFile.findMany({ where: { projectId: project.id } });
        const map = new Map(records.map((record) => [record.relativePath, record]));
        const hydrateNode = (node: FolderNode) => {
            node.files = node.files.map((file) => this.applyGeneratedMetadata(file, map.get(file.relativePath)));
            node.children.forEach(hydrateNode);
        };
        hydrateNode(tree);
    }

    private applyGeneratedMetadata(file: FolderNodeFile, record?: DocumentationGeneratedFile): FolderNodeFile {
        if (!record) {
            return file;
        }
        return {
            ...file,
            id: record.id,
            createdAt: record.createdAt.toISOString(),
            storagePath: record.storagePath,
            status: 'GENERATED',
        };
    }

    private async injectAttachments(project: Project, tree: FolderNode) {
        const attachments = await this.prisma.documentationAttachment.findMany({ where: { projectId: project.id } });
        if (!attachments.length) {
            return;
        }
        const target = this.findFolderByName(tree, '10_Vedlegg');
        if (!target) {
            return;
        }
        const attachmentFiles: FolderNodeFile[] = attachments.map((attachment) => ({
            id: attachment.id,
            relativePath: path.posix.join(target.path ?? '', this.sanitizeSegment(attachment.originalFileName)),
            fileType: this.detectFileType(attachment.originalFileName),
            source: GeneratedFileSource.USER_UPLOADED,
            description: attachment.description,
            createdAt: attachment.uploadedAt.toISOString(),
            storagePath: attachment.storedPath,
            status: 'GENERATED',
        }));
        target.files = [...target.files, ...attachmentFiles];
    }

    private findFolderByName(node: FolderNode, name: string): FolderNode | undefined {
        if (node.name.startsWith(name) || node.path === name) {
            return node;
        }
        for (const child of node.children) {
            const match = this.findFolderByName(child, name);
            if (match) {
                return match;
            }
        }
        return undefined;
    }

    private detectFileType(fileName: string): GeneratedFileType {
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        switch (ext) {
            case 'docx':
                return GeneratedFileType.DOCX;
            case 'pdf':
                return GeneratedFileType.PDF;
            case 'md':
                return GeneratedFileType.MD;
            case 'txt':
                return GeneratedFileType.TXT;
            case 'xlsx':
            case 'xls':
            case 'csv':
                return GeneratedFileType.XLSX;
            default:
                return GeneratedFileType.TXT;
        }
    }

    private async findGeneratedFile(projectId: string, relativePath: string) {
        return this.prisma.documentationGeneratedFile.findUnique({
            where: { projectId_relativePath: { projectId, relativePath } },
        });
    }

    private toAttachmentResponse(record: DocumentationAttachment) {
        return {
            id: record.id,
            projectId: record.projectId,
            originalFileName: record.originalFileName,
            storedPath: record.storedPath,
            category: record.category,
            description: record.description,
            uploadedAt: record.uploadedAt.toISOString(),
        };
    }
}
