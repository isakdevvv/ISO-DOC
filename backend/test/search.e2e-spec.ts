import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('SearchController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/search (GET) - should return empty results for empty query', () => {
        return request(app.getHttpServer())
            .get('/search?q=')
            .expect(200)
            .expect({ vectorResults: [], keywordResults: [] });
    });

    it('/search (GET) - should return results structure', async () => {
        const response = await request(app.getHttpServer())
            .get('/search?q=test')
            .expect(200);

        expect(response.body).toHaveProperty('vectorResults');
        expect(response.body).toHaveProperty('keywordResults');
        expect(Array.isArray(response.body.vectorResults)).toBe(true);
        expect(Array.isArray(response.body.keywordResults)).toBe(true);
    });
});
