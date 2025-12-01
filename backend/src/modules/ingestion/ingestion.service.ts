import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
const pdf = require('pdf-parse');


import * as fs from 'fs';

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
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

    async ingestDocument(documentId: string) {
        this.logger.log(`Starting ingestion for document ${documentId}`);

        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            this.logger.error(`Document ${documentId} not found`);
            return;
        }

        try {
            // 1. Extract Text
            const text = await this.extractText(document.filePath);

            // 2. Extract Metadata (LLM)
            const metadata = await this.extractMetadata(text);
            this.logger.log(`Extracted metadata: ${JSON.stringify(metadata)}`);

            // 3. Chunk Text
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const chunks = await splitter.createDocuments([text]);

            this.logger.log(`Created ${chunks.length} chunks for document ${documentId}`);

            // 4. Generate Embeddings & Save
            for (const [index, chunk] of chunks.entries()) {
                const embedding = await this.embeddings.embedQuery(chunk.pageContent);

                // Save to DB
                await this.prisma.$executeRaw`
                    INSERT INTO "DocumentChunk" ("id", "content", "embedding", "documentId", "pageNumber", "updatedAt")
                    VALUES (
                        gen_random_uuid(),
                        ${chunk.pageContent},
                        ${embedding}::vector,
                        ${documentId},
                        ${index + 1},
                        NOW()
                    )
                `;
            }

            // Update status and metadata
            await this.prisma.document.update({
                where: { id: documentId },
                data: {
                    status: 'ANALYZED',
                    author: metadata.author,
                    summary: metadata.summary,
                    docType: metadata.docType,
                    // publicationDate: metadata.publicationDate ? new Date(metadata.publicationDate) : null 
                },
            });

            this.logger.log(`Ingestion complete for document ${documentId}`);

        } catch (error) {
            this.logger.error(`Ingestion failed: ${error.message}`, error.stack);
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'ERROR' },
            });
        }
    }

    private async extractMetadata(text: string): Promise<any> {
        const { ChatOpenAI } = await import("@langchain/openai");
        const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

        const chat = new ChatOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'openai/gpt-3.5-turbo', // Use a cheap/fast model for metadata
            temperature: 0,
        });

        const prompt = `
            You are an expert ISO compliance auditor. Extract the following metadata from the document text provided below.
            Return ONLY a valid JSON object with these fields:
            - author: The author or organization (string)
            - summary: A brief summary of the document (string)
            - docType: One of "Policy", "Procedure", "Standard", "Record", "Other" (string)
            - publicationDate: The publication date if found (YYYY-MM-DD string), otherwise null.

            Document Text (first 3000 chars):
            ${text.substring(0, 3000)}
        `;

        try {
            const response = await chat.invoke([
                new SystemMessage("You are a helpful assistant that extracts metadata as JSON."),
                new HumanMessage(prompt),
            ]);

            const content = response.content.toString();
            // Clean up code blocks if present
            const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);
        } catch (e) {
            this.logger.error("Failed to extract metadata", e);
            return { author: "Unknown", summary: "Auto-extraction failed", docType: "Other" };
        }
    }

    private async extractText(filePath: string): Promise<string> {

        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    }
}
