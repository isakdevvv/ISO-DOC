import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class ComplianceService {
    private readonly logger = new Logger(ComplianceService.name);
    private embeddings: OpenAIEmbeddings;
    private chat: ChatOpenAI;

    constructor(private prisma: PrismaService) {
        this.embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'text-embedding-3-small',
        });

        this.chat = new ChatOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'anthropic/claude-3.5-sonnet', // Using a strong model for analysis
            temperature: 0,
        });
    }

    async checkCompliance(documentId: string, isoStandardId: string) {
        this.logger.log(`Starting compliance check for Doc ${documentId} against Standard ${isoStandardId}`);

        const document = await this.prisma.document.findUnique({ where: { id: documentId } });
        const standard = await this.prisma.isoStandard.findUnique({ where: { id: isoStandardId } });

        if (!document || !standard) {
            throw new NotFoundException('Document or ISO Standard not found');
        }

        // 1. Retrieve all chunks for the document (assuming small-ish documents for now, or we could summarize)
        // For a more scalable approach, we should iterate through ISO clauses and find relevant document chunks.
        // Let's try: Iterate through ISO Standard Chunks -> Find relevant Doc Chunks -> Verify

        // Use queryRaw to get embeddings (Unsupported type)
        const standardChunks = await this.prisma.$queryRaw<any[]>`
            SELECT id, content, embedding::text, "clauseNumber", "isoStandardId"
            FROM "IsoStandardChunk"
            WHERE "isoStandardId" = ${isoStandardId}
            ORDER BY "createdAt" ASC
            LIMIT 50
        `;

        // Parse embedding string to array
        for (const chunk of standardChunks) {
            if (typeof chunk.embedding === 'string') {
                chunk.embedding = JSON.parse(chunk.embedding);
            }
        }

        if (standardChunks.length === 0) {
            return { status: 'ERROR', message: 'No chunks found for this standard. Has it been analyzed?' };
        }

        const results = [];

        // Group chunks by clause if possible, but for now let's just process chunks in batches or individually.
        // To make it faster, let's pick a few key requirements or just process the first few chunks as a POC.
        // BETTER APPROACH:
        // 1. Get Document Summary/Context.
        // 2. For each Standard Chunk (Requirement), search for relevant Document Chunks.
        // 3. Ask LLM: "Does the document satisfy this requirement?"

        for (const stdChunk of standardChunks) {
            // Find relevant document chunks
            const relevantDocChunks = await this.findRelevantDocumentChunks(stdChunk.embedding, documentId);

            const context = relevantDocChunks.map(c => c.content).join('\n---\n');

            const complianceStatus = await this.evaluateRequirement(stdChunk.content, context);

            results.push({
                requirement: stdChunk.content.substring(0, 100) + '...',
                status: complianceStatus.status,
                reasoning: complianceStatus.reasoning,
                evidence: complianceStatus.evidence
            });
        }

        return {
            documentId,
            isoStandardId,
            results
        };
    }

    private async findRelevantDocumentChunks(embedding: any, documentId: string, limit = 3) {
        // Prisma doesn't support vector search natively in findMany yet without raw query
        // We need to use $queryRaw

        // Note: embedding is stored as vector type in DB.
        // We need to cast the input array to vector for pgvector.

        const vectorString = `[${embedding.join(',')}]`;

        const result = await this.prisma.$queryRaw`
        SELECT id, content, 1 - (embedding <=> ${vectorString}::vector) as similarity
        FROM "DocumentChunk"
        WHERE "documentId" = ${documentId}
        ORDER BY similarity DESC
        LIMIT ${limit};
    ` as any[];

        return result;
    }

    private async evaluateRequirement(requirement: string, context: string) {
        const prompt = `
        You are an ISO Compliance Auditor.
        
        REQUIREMENT (from ISO Standard):
        "${requirement}"

        EVIDENCE (from User Document):
        "${context}"

        Task: Determine if the Evidence satisfies the Requirement.
        
        Return JSON:
        {
            "status": "COMPLIANT" | "NON_COMPLIANT" | "PARTIAL" | "NOT_APPLICABLE" | "INSUFFICIENT_EVIDENCE",
            "reasoning": "Explanation...",
            "evidence": "Quote from evidence used"
        }
    `;

        try {
            const response = await this.chat.invoke([
                new SystemMessage("You are a strict and precise ISO auditor. Output valid JSON only."),
                new HumanMessage(prompt)
            ]);

            const content = response.content.toString().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(content);
        } catch (e) {
            this.logger.error("LLM evaluation failed", e);
            return { status: "ERROR", reasoning: "LLM failed", evidence: "" };
        }
    }
}
