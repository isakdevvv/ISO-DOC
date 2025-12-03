import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { File as FileRecord, IngestionJob, IngestionJobStatus, IngestionJobType, IngestionMode, LegalClass, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

import { StorageDriver, StorageService } from '@/common/storage/storage.service';
import { PrismaService } from '@/prisma.service';
import { CreateUploadRequestDto } from './dto/create-upload-request.dto';
import { IngestionQueueService } from './ingestion.queue';

export interface IngestFilesInput {
    tenantId?: string;
    projectId?: string;
    nodeId?: string;
    source?: string;
    legalClass?: LegalClass;
    ingestionMode?: IngestionMode;
    files: Express.Multer.File[];
}

interface ResolveContextInput {
    tenantId?: string;
    projectId?: string;
    nodeId?: string;
}

interface ResolvedContext {
    tenantId: string;
    project?: { id: string; tenantId: string } | null;
    node?: { id: string; projectId: string; tenantId: string } | null;
}

interface PendingFileParams {
    tenantId: string;
    projectId?: string;
    nodeId?: string;
    fileName: string;
    mimeType: string;
    size?: number;
    checksum?: string;
    source: string;
    legalClass?: LegalClass;
    ingestionMode?: IngestionMode;
}

interface PendingFileResult {
    file: FileRecord;
    job: IngestionJob;
}

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
    private readonly originalsBucket = 'original-files';
    private readonly legalClassModeMap: Record<LegalClass, IngestionMode[]> = {
        [LegalClass.A]: [IngestionMode.FULLTEXT],
        [LegalClass.B]: [IngestionMode.FULLTEXT_INTERNAL_ONLY, IngestionMode.METADATA_ONLY],
        [LegalClass.C]: [IngestionMode.METADATA_ONLY],
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly queue: IngestionQueueService,
    ) { }

    async ingestFiles(input: IngestFilesInput) {
        if (!input.files?.length) {
            throw new BadRequestException('At least one file must be provided');
        }

        const context = await this.resolveContext({
            tenantId: input.tenantId,
            projectId: input.projectId,
            nodeId: input.nodeId,
        });

        const results = [];
        for (const file of input.files) {
            const pending = await this.createPendingFile({
                tenantId: context.tenantId,
                projectId: context.project?.id,
                nodeId: context.node?.id,
                fileName: file.originalname ?? 'upload',
                mimeType: file.mimetype ?? 'application/octet-stream',
                size: file.size,
                source: input.source ?? 'UPLOAD',
                legalClass: input.legalClass,
                ingestionMode: input.ingestionMode,
            });

            await this.persistUploadedFile(pending.file, file);
            const stored = await this.prisma.file.findUnique({
                where: { id: pending.file.id },
                include: { variants: true },
            });

            if (stored) {
                results.push({
                    file: stored,
                    variants: stored.variants,
                });
            }
        }

        return { files: results };
    }

    async requestUpload(request: CreateUploadRequestDto) {
        const context = await this.resolveContext({
            tenantId: request.tenantId,
            projectId: request.projectId,
            nodeId: request.nodeId,
        });

        const pending = await this.createPendingFile({
            tenantId: context.tenantId,
            projectId: context.project?.id,
            nodeId: context.node?.id,
            fileName: request.fileName,
            mimeType: request.mimeType,
            size: request.size,
            checksum: request.checksum,
            source: request.source ?? 'UPLOAD',
            legalClass: request.legalClass,
            ingestionMode: request.ingestionMode,
        });

        const uploadPath = `/ingestion/upload/${pending.file.id}/content`;
        await this.prisma.ingestionJob.update({
            where: { id: pending.job.id },
            data: {
                metadata: {
                    phase: 'WAITING_UPLOAD',
                    uploadUrl: uploadPath,
                } as Prisma.JsonValue,
            },
        });

        return {
            fileId: pending.file.id,
            jobId: pending.job.id,
            checksum: pending.file.checksum,
            uploadUrl: uploadPath,
            uploadMethod: 'PUT',
            formField: 'file',
            bucket: this.originalsBucket,
            storageKey: pending.file.storageKey,
            requiresAuth: true,
        };
    }

    async receiveUploadedFile(fileId: string, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Missing file payload');
        }

        const record = await this.prisma.file.findUnique({ where: { id: fileId } });
        if (!record) {
            throw new NotFoundException('File not found');
        }

        await this.persistUploadedFile(record, file);

        const job = await this.prisma.ingestionJob.findFirst({
            where: { fileId: record.id, jobType: IngestionJobType.NORMALIZE_FILE },
        });

        const fileWithVariants = await this.prisma.file.findUnique({
            where: { id: record.id },
            include: { variants: true },
        });

        return {
            file: fileWithVariants,
            jobId: job?.id,
            status: job?.status ?? IngestionJobStatus.RUNNING,
        };
    }

    async listProjectFiles(projectId: string) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return this.prisma.file.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: { variants: true },
        });
    }

    async getFileStream(fileId: string) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        const download = await this.storage.getObjectStream(file.storageKey);
        return {
            stream: download.stream,
            mimeType: file.mimeType ?? download.mimeType ?? 'application/octet-stream',
            fileName: file.fileName,
        };
    }

    private async persistUploadedFile(fileRecord: FileRecord, uploaded: Express.Multer.File) {
        const buffer = await this.getFileBuffer(uploaded);
        const checksum = this.hashBuffer(buffer);

        if (fileRecord.checksum && fileRecord.checksum !== checksum) {
            await this.handleChecksumMismatch(fileRecord, uploaded, checksum);
        }

        const parsedKey = this.storage.parseStorageKey(fileRecord.storageKey);

        const bucket = parsedKey.bucket ?? this.originalsBucket;
        const objectKey = parsedKey.objectKey ?? this.buildObjectKey(fileRecord.tenantId, fileRecord.projectId, uploaded.originalname ?? fileRecord.fileName);
        const driver: StorageDriver = parsedKey.driver === 'legacy' ? 'local' : (parsedKey.driver as StorageDriver);
        const storageKey = this.storage.buildStorageKey(bucket, objectKey, driver);

        await this.storage.uploadObject({
            bucket,
            objectKey,
            body: buffer,
            contentType: uploaded.mimetype ?? 'application/octet-stream',
            driver,
        });

        await this.prisma.file.update({
            where: { id: fileRecord.id },
            data: {
                storageKey,
                fileName: uploaded.originalname ?? fileRecord.fileName,
                mimeType: uploaded.mimetype ?? fileRecord.mimeType,
                size: buffer.length,
                checksum,
                status: 'STORED',
            },
        });

        await this.prisma.ingestionJob.updateMany({
            where: { fileId: fileRecord.id, jobType: IngestionJobType.NORMALIZE_FILE },
            data: {
                status: IngestionJobStatus.RUNNING,
            },
        });

        await this.queue.enqueueNormalizeJob(fileRecord.id);

        await this.cleanupTempFile(uploaded);

        if (!fileRecord.checksum) {
            await this.prisma.file.update({
                where: { id: fileRecord.id },
                data: { checksum },
            });
        }
    }

    private async resolveContext(input: ResolveContextInput): Promise<ResolvedContext> {
        const project = input.projectId
            ? await this.prisma.project.findUnique({
                where: { id: input.projectId },
                select: { id: true, tenantId: true },
            })
            : null;

        if (input.projectId && !project) {
            throw new NotFoundException('Project not found');
        }

        const tenantId = input.tenantId ?? project?.tenantId;
        if (!tenantId) {
            throw new BadRequestException('tenantId is required when projectId is not provided');
        }

        let node: ResolvedContext['node'] = null;
        if (input.nodeId) {
            node = await this.prisma.node.findUnique({
                where: { id: input.nodeId },
                select: { id: true, projectId: true, tenantId: true },
            });
            if (!node) {
                throw new NotFoundException('Node not found');
            }
            if (project && node.projectId !== project.id) {
                throw new BadRequestException('Node does not belong to the provided project');
            }
            if (node.tenantId !== tenantId) {
                throw new BadRequestException('Node tenant mismatch');
            }
        }

        return { tenantId, project, node };
    }

    private async createPendingFile(params: PendingFileParams): Promise<PendingFileResult> {
        const objectKey = this.buildObjectKey(params.tenantId, params.projectId, params.fileName);
        const storageKey = this.storage.buildStorageKey(this.originalsBucket, objectKey);
        const classification = this.resolveClassification(params.legalClass, params.ingestionMode);

        const file = await this.prisma.file.create({
            data: {
                tenantId: params.tenantId,
                projectId: params.projectId,
                nodeId: params.nodeId,
                fileName: params.fileName,
                mimeType: params.mimeType,
                size: params.size ?? 0,
                checksum: params.checksum ?? null,
                source: params.source,
                storageKey,
                status: 'PENDING_UPLOAD',
                legalClass: classification.legalClass,
                ingestionMode: classification.ingestionMode,
                metadata: {
                    bucket: this.originalsBucket,
                } as Prisma.JsonValue,
            },
        });

        const job = await this.prisma.ingestionJob.create({
            data: {
                tenantId: params.tenantId,
                projectId: params.projectId,
                nodeId: params.nodeId,
                fileId: file.id,
                jobType: IngestionJobType.NORMALIZE_FILE,
                status: IngestionJobStatus.PENDING,
                metadata: {
                    phase: 'WAITING_UPLOAD',
                    source: params.source,
                    legalClass: classification.legalClass,
                    ingestionMode: classification.ingestionMode,
                } as Prisma.JsonValue,
            },
        });

        return { file, job };
    }

    private resolveClassification(legalClass?: LegalClass, ingestionMode?: IngestionMode) {
        const resolvedClass = legalClass ?? LegalClass.A;
        const allowed = this.legalClassModeMap[resolvedClass] ?? [IngestionMode.FULLTEXT];
        const resolvedMode = ingestionMode ?? allowed[0];

        if (!allowed.includes(resolvedMode)) {
            throw new BadRequestException(
                `Ingestion mode ${resolvedMode} is not permitted for legal class ${resolvedClass}`,
            );
        }

        return {
            legalClass: resolvedClass,
            ingestionMode: resolvedMode,
        };
    }

    private buildObjectKey(tenantId: string, projectId: string | null | undefined, fileName: string) {
        const safeName = this.sanitizeFileName(fileName);
        const scope = projectId ?? 'unassigned';
        return `${tenantId}/${scope}/${crypto.randomUUID()}-${safeName}`;
    }

    private sanitizeFileName(fileName: string) {
        return fileName
            .toLowerCase()
            .replace(/[^a-z0-9\.\-_]+/g, '-');
    }

    private hashBuffer(buffer: Buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    private async getFileBuffer(file: Express.Multer.File) {
        if (file.buffer) {
            return file.buffer;
        }
        if (!file.path) {
            throw new BadRequestException('Unable to access file buffer');
        }
        return fs.readFile(file.path);
    }

    private async cleanupTempFile(file: Express.Multer.File) {
        if (file.path) {
            try {
                await fs.unlink(file.path);
            } catch (error) {
                this.logger.debug(`Unable to cleanup temp file ${file.path}: ${error.message}`);
            }
        }
    }

    private async handleChecksumMismatch(fileRecord: FileRecord, uploaded: Express.Multer.File, calculatedChecksum: string) {
        const metadata = { ...((fileRecord.metadata as Prisma.JsonObject | null) ?? {}) } as Prisma.JsonObject;
        metadata.checksumMismatch = {
            expected: fileRecord.checksum,
            received: calculatedChecksum,
        };

        await this.prisma.file.update({
            where: { id: fileRecord.id },
            data: {
                status: 'CHECKSUM_FAILED',
                metadata,
            },
        });

        await this.prisma.ingestionJob.updateMany({
            where: { fileId: fileRecord.id, jobType: IngestionJobType.NORMALIZE_FILE },
            data: {
                status: IngestionJobStatus.FAILED,
                completedAt: new Date(),
                lastError: 'CHECKSUM_MISMATCH',
            },
        });

        await this.cleanupTempFile(uploaded);
        throw new BadRequestException('Checksum mismatch');
    }
}
