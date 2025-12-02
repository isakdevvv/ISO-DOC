import { Test, TestingModule } from '@nestjs/testing';
import { NodeStatus } from '@prisma/client';

import { ProjectsService } from './projects.service';
import { PrismaService } from '@/prisma.service';
import { CreateNodeDto } from './dto/create-node.dto';

const mockPrisma = {
    tenant: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
    },
    project: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
    },
    projectFact: {
        upsert: jest.fn(),
    },
    node: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    nodeRevision: {
        create: jest.fn(),
    },
    componentType: {
        findUnique: jest.fn(),
    },
    component: {
        create: jest.fn(),
        findFirst: jest.fn(),
    },
    nodeEdge: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
    },
    $transaction: jest.fn(),
};

const mockTransactionClient = {
    node: mockPrisma.node,
    nodeRevision: mockPrisma.nodeRevision,
    component: mockPrisma.component,
    componentType: mockPrisma.componentType,
};

describe('ProjectsService', () => {
    let service: ProjectsService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTransactionClient));
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get(ProjectsService);

        mockPrisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1' });
        mockPrisma.projectFact.upsert.mockResolvedValue({});
    });

    it('creates project with fallback tenant', async () => {
        mockPrisma.project.create.mockResolvedValue({ id: 'project-1' } as any);

        const result = await service.createProject({ name: 'Demo' } as any);

        expect(result).toEqual({ id: 'project-1' });
        expect(mockPrisma.project.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Demo' }),
        }));
    });

    it('creates node and component when component payload provided', async () => {
        mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', tenantId: 'tenant-1' });
        mockPrisma.componentType.findUnique.mockResolvedValue({ id: 'type-1' });
        mockPrisma.component.create.mockResolvedValue({ id: 'component-1' } as any);
        mockPrisma.node.create.mockResolvedValue({ id: 'node-1' } as any);
        mockPrisma.nodeRevision.create.mockResolvedValue({ id: 'rev-1' } as any);
        mockPrisma.node.findUnique.mockResolvedValue({ id: 'node-1' } as any);

        const dto: CreateNodeDto = {
            type: 'COMPONENT',
            title: 'Kompressor',
            status: NodeStatus.DRAFT,
            component: {
                componentTypeCode: 'CO2_COMPRESSOR',
            },
        } as any;

        await service.createNode('proj-1', dto);

        expect(mockPrisma.component.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ componentTypeId: 'type-1' }),
        }));
        expect(mockPrisma.node.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ componentId: 'component-1', title: 'Kompressor' }),
        }));
    });
});
