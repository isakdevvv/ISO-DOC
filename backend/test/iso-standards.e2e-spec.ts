import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { PrismaTestHelper } from '../src/test-utils/prisma-test.helper';
import * as fs from 'fs';
import * as path from 'path';

import { IsoIngestionService } from '../src/modules/iso-standards/services/iso-ingestion.service';

describe('IsoStandardsController (e2e)', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let prismaTestHelper: PrismaTestHelper;

    beforeAll(async () => {
        jest.setTimeout(30000);
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
            providers: [PrismaTestHelper, PrismaService],
        })
            .overrideProvider(IsoIngestionService)
            .useValue({
                ingestStandard: jest.fn().mockResolvedValue(undefined),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        prismaService = app.get<PrismaService>(PrismaService);
        prismaTestHelper = app.get<PrismaTestHelper>(PrismaTestHelper);

        await app.init();
    });

    beforeEach(async () => {
        // await prismaTestHelper.cleanDatabase();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/iso-standards (GET) should return empty array initially', () => {
        return request(app.getHttpServer())
            .get('/iso-standards')
            .expect(200)
            .expect([]);
    });

    // it('/iso-standards/upload (POST) should upload a file and create a record', async () => {
    //     console.log('Sending upload request...');
    //     const response = await request(app.getHttpServer())
    //         .post('/iso-standards/upload')
    //         .field('standardId', 'ISO-9001')
    //         .attach('file', Buffer.from('dummy content'), 'test.txt');
    //     console.log('Upload request finished.');
    //     expect(response.status).toBe(201);

    //     expect(response.body).toHaveProperty('id');
    //     expect(response.body.standardId).toBe('ISO-9001');
    //     expect(response.body.filename).toBeDefined();

    //     // Verify it's in the list
    //     const listResponse = await request(app.getHttpServer())
    //         .get('/iso-standards')
    //         .expect(200);

    //     expect(listResponse.body).toHaveLength(1);
    //     expect(listResponse.body[0].standardId).toBe('ISO-9001');
    // });
});
