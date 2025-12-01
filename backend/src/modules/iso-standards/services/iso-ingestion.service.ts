import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs';
const pdf = require('pdf-parse');

@Injectable()
export class IsoIngestionService {
    private readonly logger = new Logger(IsoIngestionService.name);
    private embeddings: OpenAIEmbeddings;

    constructor(private prisma: PrismaService) {
        this.embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'text-embedding-3-small',
        });
    }

    async ingestStandard(standardId: string) {
        this.logger.log(`Starting ingestion for ISO Standard ${standardId}`);

        const standard = await this.prisma.isoStandard.findUnique({
            where: { id: standardId },
        });

        if (!standard) {
            this.logger.error(`Standard ${standardId} not found`);
            return;
        }

        try {
            // 1. Extract Text
            const text = await this.extractText(standard.filePath);

            // 2. Chunk Text (TODO: Improve chunking to respect clauses)
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const chunks = await splitter.createDocuments([text]);

            this.logger.log(`Created ${chunks.length} chunks for standard ${standardId}`);

            // 3. Generate Embeddings & Save
            for (const [index, chunk] of chunks.entries()) {
                const embedding = await this.embeddings.embedQuery(chunk.pageContent);

                await this.prisma.$executeRaw`
                INSERT INTO "IsoStandardChunk" ("id", "content", "embedding", "isoStandardId", "createdAt")
                VALUES (
                    gen_random_uuid(),
                    ${chunk.pageContent},
                    ${embedding}::vector,
                    ${standardId},
                    NOW()
                )
            `;
            }

            // Update status
            await this.prisma.isoStandard.update({
                where: { id: standardId },
                data: { status: 'ANALYZED' },
            });

            this.logger.log(`Ingestion complete for standard ${standardId}`);

        } catch (error) {
            this.logger.error(`Ingestion failed: ${error.message}`, error.stack);
            await this.prisma.isoStandard.update({
                where: { id: standardId },
                data: { status: 'ERROR' },
            });
        }
    }

    private async extractText(filePath: string): Promise<string> {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    }
}
