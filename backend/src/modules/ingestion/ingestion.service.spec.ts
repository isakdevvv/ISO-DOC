import { Test, TestingModule } from '@nestjs/testing';
import { IngestionJobType } from '@prisma/client';

import { StorageService } from '@/common/storage/storage.service';
import { PrismaService } from '@/prisma.service';
import { IngestionQueueService } from './ingestion.queue';
import { IngestionService } from './ingestion.service';

jest.mock('fs/promises', () => ({
    readFile: jest.fn().mockResolvedValue(Buffer.from('file-bytes')),
    unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockStorageService = {
    buildStorageKey: jest.fn((bucket: string, objectKey: string) => `local://${bucket}/${objectKey}`),
    parseStorageKey: jest.fn(() => ({ driver: 'local', bucket: 'original-files', objectKey: 'tenant/project/file.pdf', raw: '' })),
    uploadObject: jest.fn().mockResolvedValue(undefined),
    getObjectStream: jest.fn().mockResolvedValue({
        stream: { pipe: jest.fn() },
        mimeType: 'application/pdf',
    }),
};

const mockPrismaService = {
    project: {
        findUnique: jest.fn(),
    },
    node: {
        findUnique: jest.fn(),
    },
    file: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    ingestionJob: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
    },
};

const mockQueue = {
    enqueueNormalizeJob: jest.fn().mockResolvedValue(undefined),
};

describe('IngestionService', () => {
    let service: IngestionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestionService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: StorageService, useValue: mockStorageService },
                { provide: IngestionQueueService, useValue: mockQueue },
            ],
        }).compile();

        service = module.get(IngestionService);

        jest.clearAllMocks();
    });

    it('throws when no files are provided', async () => {
        await expect(service.ingestFiles({ files: [] })).rejects.toThrow('At least one file must be provided');
    });

    it('resolves tenant from project when ingesting files', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj-1', tenantId: 'tenant-1' });
        mockPrismaService.file.create.mockResolvedValue({
            id: 'file-1',
            tenantId: 'tenant-1',
            storageKey: 'local://original-files/tenant/file.pdf',
            fileName: 'demo.pdf',
        });
        mockPrismaService.file.findUnique.mockResolvedValue({
            id: 'file-1',
            variants: [],
        });
        mockPrismaService.ingestionJob.create.mockResolvedValue({ id: 'job-1' });

        const file = {
            originalname: 'fdv.pdf',
            mimetype: 'application/pdf',
            size: 123,
            path: 'tmp/fdv.pdf',
        } as Express.Multer.File;

        const result = await service.ingestFiles({
            projectId: 'proj-1',
            files: [file],
        });

        expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({ where: { id: 'proj-1' }, select: { id: true, tenantId: true } });
        expect(mockStorageService.uploadObject).toHaveBeenCalled();
        expect(mockQueue.enqueueNormalizeJob).toHaveBeenCalledWith('file-1');
        expect(result.files).toHaveLength(1);
    });

    it('creates upload request metadata', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj-1', tenantId: 'tenant-1' });
        mockPrismaService.file.create.mockResolvedValue({
            id: 'file-req',
            tenantId: 'tenant-1',
            checksum: 'abc',
            storageKey: 'local://original-files/tenant/file.pdf',
        });
        mockPrismaService.ingestionJob.create.mockResolvedValue({ id: 'job-req' });

        const response = await service.requestUpload({
            projectId: 'proj-1',
            fileName: 'report.pdf',
            mimeType: 'application/pdf',
            size: 100,
            checksum: 'abc',
        });

        expect(response.fileId).toBe('file-req');
        expect(response.uploadUrl).toBe('/ingestion/upload/file-req/content');
        expect(mockPrismaService.ingestionJob.update).toHaveBeenCalledWith({
            where: { id: 'job-req' },
            data: {
                metadata: {
                    phase: 'WAITING_UPLOAD',
                    uploadUrl: '/ingestion/upload/file-req/content',
                },
            },
        });
    });

    it('lists project files', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({ id: 'proj-1' });
        mockPrismaService.file.findMany.mockResolvedValue([{ id: 'file-1' }]);

        const files = await service.listProjectFiles('proj-1');

        expect(files).toEqual([{ id: 'file-1' }]);
        expect(mockPrismaService.file.findMany).toHaveBeenCalledWith({
            where: { projectId: 'proj-1' },
            orderBy: { createdAt: 'desc' },
            include: { variants: true },
        });
    });

    it('fails upload when checksum does not match', async () => {
        mockPrismaService.file.findUnique.mockResolvedValueOnce({
            id: 'file-1',
            tenantId: 'tenant-1',
            projectId: 'proj-1',
            storageKey: 'local://original-files/tenant-1/demo.pdf',
            fileName: 'demo.pdf',
            mimeType: 'application/pdf',
            checksum: 'expected-checksum',
            metadata: null,
        });

        const file = {
            originalname: 'fdv.pdf',
            mimetype: 'application/pdf',
            buffer: Buffer.from('file-bytes'),
        } as Express.Multer.File;

        await expect(service.receiveUploadedFile('file-1', file)).rejects.toThrow('Checksum mismatch');

        expect(mockStorageService.uploadObject).not.toHaveBeenCalled();
        expect(mockQueue.enqueueNormalizeJob).not.toHaveBeenCalled();
        expect(mockPrismaService.ingestionJob.updateMany).toHaveBeenCalledWith({
            where: { fileId: 'file-1', jobType: IngestionJobType.NORMALIZE_FILE },
            data: expect.objectContaining({
                status: 'FAILED',
                lastError: 'CHECKSUM_MISMATCH',
            }),
        });
        expect(mockPrismaService.file.update).toHaveBeenCalledWith({
            where: { id: 'file-1' },
            data: expect.objectContaining({
                status: 'CHECKSUM_FAILED',
            }),
        });
    });
});
