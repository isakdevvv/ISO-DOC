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

            // 2. Chunk Text
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
                separators: [
                    "\n\\d+\\.\\d+\\.\\d+\\.\\d+ ", // 1.1.1.1
                    "\n\\d+\\.\\d+\\.\\d+ ",       // 1.1.1
                    "\n\\d+\\.\\d+ ",             // 1.1
                    "\n\\d+\\. ",                 // 1.
                    "\n\n",
                    "\n",
                    " ",
                    "",
                ],
                keepSeparator: true,
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

            // Extract Required Documents
            const requiredDocs = await this.extractRequiredDocuments(text);
            this.logger.log(`Extracted ${requiredDocs.length} required documents`);

            // Update status
            await this.prisma.isoStandard.update({
                where: { id: standardId },
                data: {
                    status: 'ANALYZED',
                    requiredDocuments: requiredDocs
                },
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

    private async extractRequiredDocuments(text: string): Promise<any[]> {
        const { ChatOpenAI } = await import("@langchain/openai");
        const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

        const chat = new ChatOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'openai/gpt-4o-mini',
            temperature: 0,
        });

        const prompt = `
            You are an expert ISO consultant. Analyze the ISO Standard text below and identify all "Documented Information" (Policies, Procedures, Records, Plans) that are explicitly REQUIRED.
            
            Return ONLY a valid JSON array of objects:
            [
                {
                    "title": "Information Security Policy",
                    "type": "Policy",
                    "description": "High level policy on info sec",
                    "clause": "5.2"
                }
            ]

            Standard Text (first 15000 chars):
            ${text.substring(0, 15000)}
        `;

        try {
            const response = await chat.invoke([
                new SystemMessage("You are a helpful assistant that extracts required documents as JSON."),
                new HumanMessage(prompt),
            ]);

            const content = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(content);
        } catch (e) {
            this.logger.error("Failed to extract required documents", e);
            return [];
        }
    }
}
