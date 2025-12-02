import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../../prisma.service';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('pdf-parse', () => {
    return jest.fn().mockResolvedValue({ text: 'Mock PDF content' });
});

jest.mock('mammoth', () => ({
    extractRawText: jest.fn().mockResolvedValue({ value: 'Docx Content' }),
}));

jest.mock('@langchain/openai', () => {
    return {
        OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
            embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
        })),
        ChatOpenAI: jest.fn().mockImplementation(() => ({
            invoke: jest.fn().mockResolvedValue({
                content: JSON.stringify({
                    author: 'Test Author',
                    summary: 'Test Summary',
                    docType: 'Policy',
                    publicationDate: '2023-01-01',
                }),
            }),
        })),
    };
});

jest.mock('@langchain/textsplitters', () => {
    return {
        RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
            createDocuments: jest.fn().mockResolvedValue([
                { pageContent: 'Chunk 1', metadata: {} },
                { pageContent: 'Chunk 2', metadata: {} },
            ]),
        })),
    };
});

const mockPrismaService = {
    document: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $executeRaw: jest.fn(),
};

describe('IngestionService', () => {
    let service: IngestionService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestionService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<IngestionService>(IngestionService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('ingestDocument', () => {
        it('should successfully ingest a document', async () => {
            const documentId = 'doc-1';
            const mockDocument = {
                id: documentId,
                filePath: '/path/to/doc.pdf',
            };

            mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy'));

            await service.ingestDocument(documentId);

            // Verify Prisma calls
            expect(prisma.document.findUnique).toHaveBeenCalledWith({ where: { id: documentId } });
            expect(prisma.$executeRaw).toHaveBeenCalledTimes(2); // 2 chunks
            expect(prisma.document.update).toHaveBeenCalledWith({
                where: { id: documentId },
                data: expect.objectContaining({
                    status: 'ANALYZED',
                    author: 'Test Author',
                }),
            });
        });

        it('should handle document not found', async () => {
            mockPrismaService.document.findUnique.mockResolvedValue(null);
            await service.ingestDocument('doc-1');
            expect(prisma.document.update).not.toHaveBeenCalled();
        });

        it('should handle errors during ingestion', async () => {
            const documentId = 'doc-1';
            mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId, filePath: 'path.pdf' });
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File read error');
            });

            await service.ingestDocument(documentId);

            expect(prisma.document.update).toHaveBeenCalledWith({
                where: { id: documentId },
                data: { status: 'ERROR' },
            });
        });

        it('should ingest JSON files', async () => {
            const documentId = 'doc-json';
            mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId, filePath: 'test.json' });
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify({ key: 'value' })));

            await service.ingestDocument(documentId);

            expect(prisma.$executeRaw).toHaveBeenCalled();
        });

        it('should ingest TXT files', async () => {
            const documentId = 'doc-txt';
            mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId, filePath: 'test.txt' });
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('Plain text content'));

            await service.ingestDocument(documentId);

            expect(prisma.$executeRaw).toHaveBeenCalled();
        });

        it('should ingest DOCX files', async () => {
            const documentId = 'doc-docx';
            mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId, filePath: 'test.docx' });
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy docx'));

            await service.ingestDocument(documentId);

            expect(prisma.$executeRaw).toHaveBeenCalled();
        });

        it('should throw error for unsupported file types', async () => {
            const documentId = 'doc-unknown';
            mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId, filePath: 'test.xyz' });
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy'));

            await service.ingestDocument(documentId);

            expect(prisma.document.update).toHaveBeenCalledWith({
                where: { id: documentId },
                data: { status: 'ERROR' },
            });
        });
    });
});
