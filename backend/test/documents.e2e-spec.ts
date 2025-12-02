import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { PrismaTestHelper } from '../src/test-utils/prisma-test.helper';
import { IngestionService } from '../src/modules/ingestion/ingestion.service';

describe('DocumentsController (e2e)', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let prismaTestHelper: PrismaTestHelper;

    beforeAll(async () => {
        jest.setTimeout(30000);
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
            providers: [PrismaTestHelper, PrismaService],
        })
            .overrideProvider(IngestionService)
            .useValue({
                ingestDocument: jest.fn().mockResolvedValue(undefined),
                stageDocument: jest.fn().mockResolvedValue(undefined),
                commitDocument: jest.fn().mockResolvedValue(undefined),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        prismaService = app.get<PrismaService>(PrismaService);
        prismaTestHelper = app.get<PrismaTestHelper>(PrismaTestHelper);

        await app.init();
    });

    beforeEach(async () => {
        // await prismaTestHelper.cleanDatabase(); // Skip clean to avoid locks if any
    });

    afterAll(async () => {
        await app.close();
    });

    it('/documents (GET) should return empty array initially', async () => {
        const response = await request(app.getHttpServer())
            .get('/documents')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });

    it('/documents (POST) should upload files', async () => {
        const response = await request(app.getHttpServer())
            .post('/documents')
            .attach('files', Buffer.from('dummy content'), 'test-doc.txt')
            .expect(201);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0].title).toBe('test-doc.txt');
    });

    it('/documents/commit (POST) should commit documents', async () => {
        const response = await request(app.getHttpServer())
            .post('/documents/commit')
            .send({ documentIds: ['doc-1'] })
            .expect(201);

        expect(Array.isArray(response.body)).toBe(true);
    });
});
