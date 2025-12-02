import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
const pdf = require('pdf-parse');


import * as fs from 'fs';
import { Document } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
    private embeddings: OpenAIEmbeddings;
    private readonly metadataTimeoutMs = Number(process.env.DOC_STAGE_TIMEOUT_MS || 30000);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) {
        this.embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'text-embedding-3-small',
        });
    }

    /**
     * Fails fast if the wrapped promise does not settle within the timeout.
     */
    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        let timeout: NodeJS.Timeout | undefined;
        try {
            return await Promise.race<T>([
                promise,
                new Promise<T>((_, reject) => {
                    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
                }),
            ]);
        } finally {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }

    async stageDocument(documentId: string) {
        this.logger.log(`Starting staging for document ${documentId}`);

        let document: Document | null = null;

        try {
            document = await this.prisma.document.findUnique({
                where: { id: documentId },
            });

            if (!document) {
                this.logger.error(`Document ${documentId} not found`);
                return;
            }

            // 1. Extract Text
            const text = await this.extractText(document.filePath);

            // 2. Extract Metadata (LLM)
            const metadata = await this.withTimeout(
                this.extractMetadata(text),
                this.metadataTimeoutMs,
                `Metadata extraction timed out after ${this.metadataTimeoutMs}ms`
            );
            this.logger.log(`Extracted metadata: ${JSON.stringify(metadata)}`);

            // 3. Chunk Text
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const chunks = await splitter.createDocuments([text]);

            this.logger.log(`Created ${chunks.length} chunks for document ${documentId}`);

            // 4. Save Chunks (WITHOUT Embeddings)
            // Using transaction to ensure atomicity
            await this.prisma.$transaction(async (tx) => {
                // Clear existing chunks if any (re-staging)
                await tx.documentChunk.deleteMany({ where: { documentId } });

                for (const [index, chunk] of chunks.entries()) {
                    await tx.documentChunk.create({
                        data: {
                            content: chunk.pageContent,
                            pageNumber: index + 1,
                            documentId: documentId,
                            // embedding is null by default
                        }
                    });
                }

                // Update status and metadata
                await tx.document.update({
                    where: { id: documentId },
                    data: {
                        status: 'STAGED',
                        author: metadata.metadata?.author || 'Unknown',
                        summary: metadata.metadata?.summary || 'No summary',
                        docType: metadata.metadata?.docType || 'Other',
                        extractedData: metadata // Save full JSON
                    },
                });
            });

            this.logger.log(`Staging complete for document ${documentId}`);

        } catch (error) {
            const message = (error as Error)?.message || 'Unknown staging error';
            this.logger.error(`Staging failed: ${message}`, (error as any)?.stack);

            // Do not attempt to update if the document was never loaded (e.g. deleted meanwhile)
            if (document) {
                await this.prisma.document.update({
                    where: { id: documentId },
                    data: {
                        status: 'ERROR',
                        errorMessage: message
                    },
                });
            }
            throw error;
        }
    }

    async commitDocument(documentId: string) {
        this.logger.log(`Committing document ${documentId} (Generating Embeddings)`);

        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
            include: { chunks: true }
        });

        if (!document || document.status !== 'STAGED') {
            throw new Error(`Document ${documentId} is not in STAGED status`);
        }

        try {
            // Generate Embeddings & Update Chunks
            for (const chunk of document.chunks) {
                const embedding = await this.embeddings.embedQuery(chunk.content);

                // Save embedding using raw query for vector type
                await this.prisma.$executeRaw`
                    UPDATE "DocumentChunk"
                    SET "embedding" = ${embedding}::vector
                    WHERE "id" = ${chunk.id}
                `;
            }

            // Update status
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'ANALYZED' },
            });

            await this.prisma.documentTask.updateMany({
                where: { documentId },
                data: { status: 'READY' },
            });

            this.logger.log(`Commit complete for document ${documentId}`);

            // Notify Success
            await this.notificationsService.create({
                title: 'Analysis Complete',
                message: `Document "${document.title}" has been successfully analyzed and added to the knowledge base.`,
                type: 'SUCCESS'
            });

        } catch (error) {
            this.logger.error(`Commit failed: ${error.message}`, error.stack);

            // Notify Failure
            await this.notificationsService.create({
                title: 'Analysis Failed',
                message: `Failed to analyze document "${document.title}": ${error.message}`,
                type: 'ERROR'
            });

            throw error;
        }
    }

    // Deprecated: Kept for backward compatibility if needed, but redirects to new flow
    async ingestDocument(documentId: string) {
        await this.stageDocument(documentId);
        await this.commitDocument(documentId);
    }

    private async extractMetadata(text: string): Promise<any> {
        const { ChatOpenAI } = await import("@langchain/openai");
        const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");

        const chat = new ChatOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'openai/gpt-4o-mini', // Better model for structured extraction
            temperature: 0,
        });

        const prompt = `
            You are an expert ISO compliance auditor and data extractor. 
            Analyze the document text provided below and extract a COMPLETE structured representation.
            
            Return ONLY a valid JSON object with the following structure:
            {
                "metadata": {
                    "author": "string",
                    "title": "string",
                    "date": "YYYY-MM-DD or null",
                    "version": "string or null",
                    "docType": "Policy | Procedure | Standard | Record | Other",
                    "summary": "string"
                },
                "structure": {
                    "sections": [
                        {
                            "title": "Section Title",
                            "content": "Summary or key content of section",
                            "clauses": [
                                { "id": "1.1", "title": "Clause Title", "text": "Full text of clause" }
                            ]
                        }
                    ]
                },
                "key_entities": ["List of important entities/roles mentioned"],
                "definitions": [{"term": "Term", "definition": "Definition"}]
            }

            Document Text (first 15000 chars):
            ${text.substring(0, 15000)}
        `;

        try {
            const response = await chat.invoke([
                new SystemMessage("You are a helpful assistant that extracts structured data as JSON."),
                new HumanMessage(prompt),
            ]);

            const content = response.content.toString();
            // Clean up code blocks if present
            const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);
        } catch (e) {
            this.logger.error("Failed to extract metadata", e);
            return {
                metadata: { author: "Unknown", summary: "Auto-extraction failed", docType: "Other" },
                structure: { sections: [] }
            };
        }
    }

    async search(query: string, limit: number = 5): Promise<any[]> {
        const embedding = await this.embeddings.embedQuery(query);
        const results = await this.prisma.$queryRaw`
            SELECT "content", "documentId", 1 - ("embedding" <=> ${embedding}::vector) as similarity
            FROM "DocumentChunk"
            ORDER BY similarity DESC
            LIMIT ${limit};
        `;
        return results as any[];
    }

    private async extractText(filePath: string): Promise<string> {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const dataBuffer = fs.readFileSync(filePath);

        switch (ext) {
            case 'pdf':
                const data = await pdf(dataBuffer);
                return data.text;
            case 'json':
                const jsonData = JSON.parse(dataBuffer.toString('utf-8'));
                return JSON.stringify(jsonData, null, 2);
            case 'txt':
                return dataBuffer.toString('utf-8');
            case 'docx':
                const mammoth = require('mammoth');
                const result = await mammoth.extractRawText({ buffer: dataBuffer });
                return result.value;
            default:
                throw new Error(`Unsupported file type: .${ext}`);
        }
    }
}
