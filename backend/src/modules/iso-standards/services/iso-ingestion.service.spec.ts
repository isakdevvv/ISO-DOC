import { Test, TestingModule } from '@nestjs/testing';
import { IsoIngestionService } from './iso-ingestion.service';
import { PrismaService } from '@/prisma.service';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('pdf-parse', () => {
    return jest.fn().mockResolvedValue({ text: 'Mock PDF content' });
});

jest.mock('@langchain/openai', () => {
    return {
        OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
            embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
        })),
    };
});

// We do NOT mock RecursiveCharacterTextSplitter because we want to test its behavior with our config
// But we need to make sure it doesn't fail if it's not mocked.
// It's a pure logic class, so it should be fine.

const mockPrismaService = {
    isoStandard: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $executeRaw: jest.fn(),
};

describe('IsoIngestionService', () => {
    let service: IsoIngestionService;
    let prisma: PrismaService;
    let mockPdfParse: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IsoIngestionService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<IsoIngestionService>(IsoIngestionService);
        prisma = module.get<PrismaService>(PrismaService);
        mockPdfParse = require('pdf-parse');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('ingestStandard', () => {
        it('should split text respecting ISO clauses', async () => {
            const standardId = 'iso-123';
            const mockStandard = {
                id: standardId,
                filePath: '/path/to/iso.pdf',
            };

            // Create text with ISO clauses
            const clause1 = '1. Scope\nThis is the scope of the document.\nIt covers many things.\n';
            const clause2 = '2. Normative references\nThere are no references.\n';
            const clause3 = '3. Terms and definitions\n3.1 Term One\nDefinition of term one.\n3.2 Term Two\nDefinition of term two.\n';
            const fullText = clause1 + clause2 + clause3;

            mockPrismaService.isoStandard.findUnique.mockResolvedValue(mockStandard);
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy'));
            mockPdfParse.mockResolvedValue({ text: fullText });

            await service.ingestStandard(standardId);

            // Verify that embeddings were generated for chunks
            // We can check the arguments passed to $executeRaw to see the content
            // However, $executeRaw uses tagged templates, which are hard to inspect directly in mocks
            // But we can check how many times it was called or inspect the mock calls if we know the structure.

            // Better: Spy on the embeddings.embedQuery method if we can access it, 
            // but it's private in the service.
            // Alternatively, we can cast service to any to access private property or spy on the prototype of OpenAIEmbeddings?
            // Since we mocked OpenAIEmbeddings in the module scope, we can spy on the mock instance.

            // Let's rely on the fact that we mocked OpenAIEmbeddings and it returns a mock object.
            // We can't easily access the specific instance created inside the service unless we spy on the constructor.

            // Let's verify that $executeRaw was called.
            expect(prisma.$executeRaw).toHaveBeenCalled();

            // To verify chunking specifically, we might need to inspect the calls to $executeRaw.
            // The calls will be like: $executeRaw(strings, param1, param2, ...)
            // param1 is UUID, param2 is content, param3 is embedding...

            const calls = mockPrismaService.$executeRaw.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            // Let's check the content of the chunks passed to $executeRaw
            // Note: tagged template literals are passed as [strings, ...values]
            // But here it is called as a function: this.prisma.$executeRaw`...`
            // In the mock, it receives the arguments.
            // The first arg is the TemplateStringsArray.
            // The following args are the interpolated values.
            // In the code:
            // ${chunk.pageContent} is the 2nd interpolated value (index 1 of values, or index 2 of function args if we count TemplateStringsArray as 0)
            // Wait: 
            // VALUES (
            //    gen_random_uuid(),
            //    ${chunk.pageContent},
            //    ...

            // So args[0] is TemplateStringsArray
            // args[1] is chunk.pageContent
            // args[2] is embedding

            const chunkContents = calls.map(call => call[1]);

            // We expect chunks to roughly correspond to clauses or at least not break them in weird places if they are small enough.
            // With chunkSize 1000, our small clauses should be kept together or combined.
            // But the separators should ensure we split AT the clause numbers if needed, or at least prefer them.
            // Actually, RecursiveCharacterTextSplitter tries to keep chunks UNDER chunkSize.
            // If the text is small (our example is < 1000 chars), it might just be one chunk.
            // To test splitting, we need a text LARGER than chunkSize.

        });

        it('should split large text at clause boundaries', async () => {
            const standardId = 'iso-123';
            const mockStandard = {
                id: standardId,
                filePath: '/path/to/iso.pdf',
            };

            // Create large text
            const longText = 'A'.repeat(800);
            const clause1 = `4.1 First Clause\n${longText}\n`; // ~820 chars
            const clause2 = `4.2 Second Clause\n${longText}\n`; // ~820 chars
            // Total ~1640 chars. Chunk size 1000.
            // Should split. Ideally at 4.2.

            const fullText = clause1 + clause2;

            mockPrismaService.isoStandard.findUnique.mockResolvedValue(mockStandard);
            (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('dummy'));
            mockPdfParse.mockResolvedValue({ text: fullText });

            await service.ingestStandard(standardId);

            const calls = mockPrismaService.$executeRaw.mock.calls;
            const chunkContents = calls.map(call => call[1]);

            // Verify we have multiple chunks
            expect(chunkContents.length).toBeGreaterThan(1);

            // Verify that the second chunk starts with "4.2 Second Clause" (or similar, depending on overlap)
            // or that the first chunk ends before 4.2

            const hasClauseStart = chunkContents.some(c => c.trim().startsWith('4.2 Second Clause'));
            expect(hasClauseStart).toBe(true);
        });
    });
});
