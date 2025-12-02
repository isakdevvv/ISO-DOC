import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma.service';

const mockPrismaService = {
    document: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
    },
    documentTask: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
    },
};

describe('DocumentsService', () => {
    let service: DocumentsService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocumentsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<DocumentsService>(DocumentsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createDocument', () => {
        it('should create a document', async () => {
            const documentData = {
                title: 'ISO 9001:2015',
                filePath: '/uploads/iso-9001.pdf',
                status: 'PENDING',
            };

            const expectedResult = {
                id: 'doc-123',
                ...documentData,
                createdAt: new Date(),
                updatedAt: new Date(),
                content: null,
                author: null,
                summary: null,
                docType: null,
                publicationDate: null,
            };

            mockPrismaService.document.create.mockResolvedValue(expectedResult);

            const result = await service.createDocument(documentData);
            expect(result).toEqual(expectedResult);
            expect(prisma.document.create).toHaveBeenCalledWith({ data: documentData });
        });
    });

    describe('documents', () => {
        it('should return an array of documents', async () => {
            const expectedResult = [
                {
                    id: 'doc-123',
                    title: 'ISO 9001:2015',
                    filePath: '/uploads/iso-9001.pdf',
                    status: 'PENDING',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            mockPrismaService.document.findMany.mockResolvedValue(expectedResult);

            const result = await service.documents({});
            expect(result).toEqual(expectedResult);
            expect(prisma.document.findMany).toHaveBeenCalled();
        });
    });

    describe('document', () => {
        it('should return a single document', async () => {
            const expectedResult = {
                id: 'doc-123',
                title: 'ISO 9001:2015',
                filePath: '/uploads/iso-9001.pdf',
                status: 'PENDING',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockPrismaService.document.findUnique.mockResolvedValue(expectedResult);

            const result = await service.document({ id: 'doc-123' });
            expect(result).toEqual(expectedResult);
            expect(prisma.document.findUnique).toHaveBeenCalledWith({
                where: { id: 'doc-123' },
            });
        });
    });
});
