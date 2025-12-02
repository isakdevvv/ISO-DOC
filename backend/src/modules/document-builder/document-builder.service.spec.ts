import { NodeStatus } from '@prisma/client';

import { DocumentBuilderService } from './document-builder.service';

describe('DocumentBuilderService', () => {
    const mockPrisma: any = {
        node: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        documentTemplate: {
            findFirst: jest.fn(),
        },
        requirementsModel: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    const mockTx: any = {
        nodeRevision: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        generationSnapshot: {
            create: jest.fn(),
        },
        documentSegment: {
            create: jest.fn(),
        },
        documentSegmentProvenance: {
            create: jest.fn(),
        },
        node: {
            update: jest.fn(),
        },
    };

    const mockRagService: any = {
        getProjectContext: jest.fn(),
    };

    const service = new DocumentBuilderService(mockPrisma, mockRagService);

    beforeEach(() => {
        jest.clearAllMocks();

        mockPrisma.node.findUnique.mockResolvedValue({
            id: 'node-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            templateCode: 'FDV_CORE',
            templateVersion: '1.0.0',
            status: NodeStatus.DRAFT,
            data: null,
            facts: {},
            metadata: {},
            project: {
                id: 'project-1',
                facts: { medium: 'CO2' },
            },
        });

        mockPrisma.documentTemplate.findFirst.mockResolvedValue({
            id: 'tpl-1',
            code: 'FDV_CORE',
            version: '1.0.0',
            schema: {
                sections: [
                    {
                        id: 'overview',
                        title: 'Overview',
                        fields: [
                            { id: 'ps', label: 'PS', autoFilled: true, required: true },
                            { id: 'notes', label: 'Notes', required: false },
                        ],
                    },
                ],
            },
        });

        mockPrisma.requirementsModel.findFirst.mockResolvedValue({
            id: 'req-1',
            scope: 'FULL',
            version: 1,
            metadata: {},
            payload: {
                requiredFields: [{ path: 'notes', data: { default: 'Manual note' } }],
            },
            ruleEvaluationId: 'eval-1',
        });

        mockRagService.getProjectContext.mockResolvedValue({
            projectId: 'project-1',
            fields: [
                {
                    fieldId: 'overview::ps',
                    label: 'PS',
                    fromCache: false,
                    chunks: [
                        {
                            segmentId: 'seg-source-1',
                            content: 'Auto generated content',
                            metadata: { fileId: 'file-1', sourceType: 'FILE' },
                            similarity: 0.9,
                        },
                    ],
                },
                {
                    fieldId: 'overview::notes',
                    label: 'Notes',
                    fromCache: false,
                    chunks: [],
                },
            ],
        });

        mockTx.nodeRevision.findFirst.mockResolvedValue({ revisionNumber: 1 });
        mockTx.nodeRevision.create.mockResolvedValue({ id: 'rev-2' });
        mockTx.generationSnapshot.create.mockResolvedValue({ id: 'snap-1', createdAt: new Date() });
        mockTx.documentSegment.create.mockResolvedValue({ id: 'segment-1' });
        mockTx.documentSegmentProvenance.create.mockResolvedValue({});
        mockTx.node.update.mockResolvedValue({});

        mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockTx));

        mockPrisma.node.update.mockResolvedValue({});
    });

    it('generates node data and snapshots', async () => {
        const result = await service.generateNode('node-1');

        expect(result.nodeId).toBe('node-1');
        expect(result.sections).toHaveLength(1);
        expect(result.autoFilledFields).toContain('ps');
        expect(result.fieldsNeedingUserInput).not.toContain('ps');
        expect(mockRagService.getProjectContext).toHaveBeenCalledWith(expect.objectContaining({
            projectId: 'project-1',
        }));
        expect(mockTx.documentSegment.create).toHaveBeenCalled();
        expect(mockTx.documentSegmentProvenance.create).toHaveBeenCalled();
        expect(mockTx.node.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'node-1' },
            data: expect.objectContaining({ status: NodeStatus.PENDING_REVIEW }),
        }));
    });
});
