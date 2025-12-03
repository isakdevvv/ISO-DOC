import { IngestionMode, LegalClass } from '@prisma/client';

import { RagService } from './rag.service';

describe('RagService helpers', () => {
    let service: RagService;
    const prismaMock = { $queryRaw: jest.fn() };
    const embeddingsMock = { embedQuery: jest.fn() };
    const aiFactoryMock = { getEmbeddings: jest.fn(() => embeddingsMock) };

    beforeEach(() => {
        service = new RagService(prismaMock as any, aiFactoryMock as any);
    });

    it('enriches field queries with requirement metadata and facts', () => {
        const buildFieldQuery = (service as any).buildFieldQuery.bind(service);
        const query = buildFieldQuery(
            { fieldId: 'ps', label: 'PS (bar)' },
            {
                requiredFields: [{
                    path: 'sections.pressure.ps',
                    description: 'Operating pressure must be captured',
                    severity: 'HIGH',
                }],
                factsSnapshot: {
                    ps: '14 bar',
                    medium: 'CO2',
                },
            },
        );

        expect(query).toContain('PS (bar)');
        expect(query).toContain('Operating pressure must be captured');
        expect(query).toContain('14 bar');
    });

    it('filters preferred sources using a case insensitive match', () => {
        const filterByPreferredSources = (service as any).filterByPreferredSources.bind(service);
        const filtered = filterByPreferredSources(
            [
                { metadata: { sourceType: 'manual' } },
                { metadata: { sourceType: 'rule' } },
                { metadata: null },
            ],
            ['RULE'],
        );

        expect(filtered).toHaveLength(1);
        expect(filtered[0].metadata.sourceType).toBe('rule');
    });

    it('filters rows by legal class and ingestion mode', () => {
        const filterByLegalAccess = (service as any).filterByLegalAccess.bind(service);
        const rows = [
            { metadata: { legalClass: 'A', ingestionMode: 'FULLTEXT' } },
            { metadata: { legalClass: 'B', ingestionMode: 'FULLTEXT_INTERNAL_ONLY' } },
            { metadata: { legalClass: 'C', ingestionMode: 'METADATA_ONLY' } },
        ];

        const filtered = filterByLegalAccess(rows, [LegalClass.A], [IngestionMode.FULLTEXT]);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].metadata.legalClass).toBe('A');
    });
});
