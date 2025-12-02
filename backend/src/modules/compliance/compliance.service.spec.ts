import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../prisma.service';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

// Mock LangChain classes
jest.mock('@langchain/openai', () => {
    return {
        OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
            embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
        })),
        ChatOpenAI: jest.fn().mockImplementation(() => ({
            invoke: jest.fn().mockResolvedValue({
                content: JSON.stringify({
                    status: 'COMPLIANT',
                    reasoning: 'Matches requirements',
                    evidence: 'Found evidence',
                }),
            }),
        })),
    };
});

const mockPrismaService = {
    document: {
        findUnique: jest.fn(),
    },
    isoStandard: {
        findUnique: jest.fn(),
    },
    complianceReport: {
        create: jest.fn(),
    },
    $queryRaw: jest.fn(),
};

describe('ComplianceService', () => {
    let service: ComplianceService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComplianceService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<ComplianceService>(ComplianceService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('checkCompliance', () => {
        it('should perform compliance check', async () => {
            const documentId = 'doc-1';
            const isoStandardId = 'iso-1';

            mockPrismaService.document.findUnique.mockResolvedValue({ id: documentId });
            mockPrismaService.isoStandard.findUnique.mockResolvedValue({ id: isoStandardId });

            // Mock queryRaw for standard chunks
            mockPrismaService.$queryRaw
                .mockResolvedValueOnce([
                    {
                        id: 'chunk-1',
                        content: 'Requirement 1',
                        embedding: JSON.stringify([0.1, 0.2, 0.3]),
                        clauseNumber: '1.1',
                        isoStandardId: isoStandardId,
                    },
                ])
                // Mock queryRaw for document chunks (similarity search)
                .mockResolvedValueOnce([
                    {
                        id: 'doc-chunk-1',
                        content: 'Evidence 1',
                        similarity: 0.9,
                    },
                ]);

            // Mock complianceReport.create
            const mockReport = {
                id: 'report-1',
                documentId,
                isoStandardId,
                status: 'COMPLETED',
                overallScore: 100,
                results: [
                    {
                        requirement: 'Requirement 1...',
                        status: 'COMPLIANT',
                        reasoning: 'Matches requirements',
                        evidence: 'Found evidence',
                        clauseNumber: '1.1'
                    }
                ]
            };
            mockPrismaService.complianceReport.create.mockResolvedValue(mockReport);

            const result = await service.checkCompliance(documentId, isoStandardId);

            if ('message' in result) {
                throw new Error('Expected successful result, got error: ' + result.message);
            }

            expect(result).toBeDefined();
            expect(result.id).toBe('report-1');
            expect(result.documentId).toBe(documentId);
            expect(result.isoStandardId).toBe(isoStandardId);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].status).toBe('COMPLIANT');
            expect(mockPrismaService.complianceReport.create).toHaveBeenCalled();
        });

        it('should throw NotFoundException if document not found', async () => {
            mockPrismaService.document.findUnique.mockResolvedValue(null);
            mockPrismaService.isoStandard.findUnique.mockResolvedValue({ id: 'iso-1' });

            await expect(service.checkCompliance('doc-1', 'iso-1')).rejects.toThrow('Document or ISO Standard not found');
        });
    });
});
