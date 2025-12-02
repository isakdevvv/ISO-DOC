import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { DocumentProcessingService } from '../src/common/processing/document-processing.service';
import { AiClientFactory } from '../src/common/ai/ai-client.factory';
import { DocumentIndexingService } from '../src/modules/rag/document-indexing.service';
import { PrismaService } from '../src/prisma.service';

describe('ProjectsController (e2e)', () => {
    let app: INestApplication;

    const projectsService = {
        createProject: jest.fn().mockResolvedValue({ id: 'proj-123', name: 'Demo' }),
        updateProject: jest.fn(),
        getProjects: jest.fn().mockResolvedValue([]),
        getProject: jest.fn().mockResolvedValue({ id: 'proj-123' }),
        createNode: jest.fn().mockResolvedValue({ id: 'node-1' }),
        listNodes: jest.fn().mockResolvedValue([]),
        listEdges: jest.fn().mockResolvedValue([]),
        linkNodes: jest.fn().mockResolvedValue({ id: 'edge-1' }),
        unlinkNodes: jest.fn().mockResolvedValue({ removed: true }),
    };

    const prismaMock = {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        tenant: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
    } as unknown as PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ProjectsService)
            .useValue(projectsService)
            .overrideProvider(PrismaService)
            .useValue(prismaMock)
            .overrideProvider(DocumentIndexingService)
            .useValue({ indexPlainTextVariant: jest.fn() })
            .overrideProvider(DocumentProcessingService)
            .useValue({
                chunkText: jest.fn().mockResolvedValue([{ pageContent: 'demo chunk' }]),
                extractText: jest.fn().mockResolvedValue('demo text'),
            })
            .overrideProvider(AiClientFactory)
            .useValue({ getEmbeddings: () => ({ embedDocuments: jest.fn().mockResolvedValue([[0]]) }) })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { tenantId: 'tenant-1', username: 'tester', sub: 'user-1' };
                    return true;
                },
            })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/projects (POST) returns created project', async () => {
        projectsService.createProject.mockResolvedValueOnce({ id: 'proj-200', name: 'Demo' });
        await request(app.getHttpServer())
            .post('/projects')
            .send({ name: 'Demo' })
            .expect(201)
            .expect({ id: 'proj-200', name: 'Demo' });
    });

    it('/projects/:id/edges (POST) forwards to service', async () => {
        projectsService.linkNodes.mockResolvedValueOnce({ id: 'edge-22' });
        await request(app.getHttpServer())
            .post('/projects/proj-1/edges')
            .send({ fromNodeId: 'node-a', toNodeId: 'node-b', edgeType: 'CONTAINS' })
            .expect(201)
            .expect({ id: 'edge-22' });
        expect(projectsService.linkNodes).toHaveBeenCalledWith('proj-1', expect.objectContaining({ edgeType: 'CONTAINS' }), 'tenant-1');
    });
});
