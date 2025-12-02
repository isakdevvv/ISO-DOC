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

        // Process chunks in batches to avoid rate limits but improve speed
        const BATCH_SIZE = 5;
        for (let i = 0; i < standardChunks.length; i += BATCH_SIZE) {
            const batch = standardChunks.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (stdChunk) => {
                // Find relevant document chunks
                const relevantDocChunks = await this.findRelevantDocumentChunks(stdChunk.embedding, documentId);

                const context = relevantDocChunks.map(c => c.content).join('\n---\n');

                const complianceStatus = await this.evaluateRequirement(stdChunk.content, context);

                results.push({
                    requirement: stdChunk.content.substring(0, 100) + '...',
                    status: complianceStatus.status,
                    reasoning: complianceStatus.reasoning,
                    evidence: complianceStatus.evidence,
                    clauseNumber: stdChunk.clauseNumber
                });
            }));
        }

        // Calculate overall score (simple percentage of COMPLIANT)
        const compliantCount = results.filter(r => r.status === 'COMPLIANT').length;
        const overallScore = (compliantCount / results.length) * 100;

        // Save Report to DB
        const report = await this.prisma.complianceReport.create({
            data: {
                documentId,
                isoStandardId,
                status: 'COMPLETED',
                overallScore,
                results: {
                    create: results.map(r => ({
                        requirement: r.requirement,
                        status: r.status,
                        reasoning: r.reasoning,
                        evidence: r.evidence,
                        clauseNumber: r.clauseNumber // Assuming we can get this from stdChunk later
                    }))
                }
            },
            include: {
                results: true
            }
        });

        return report;
    }

    async getReport(id: string) {
        return this.prisma.complianceReport.findUnique({
            where: { id },
            include: {
                results: true,
                document: true,
                isoStandard: true
            }
        });
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
    async runGapAnalysis(isoStandardId: string) {
        const standard = await this.prisma.isoStandard.findUnique({ where: { id: isoStandardId } });
        if (!standard || !standard.requiredDocuments) {
            throw new NotFoundException('ISO Standard not found or not analyzed');
        }

        // Get all user documents
        const userDocs = await this.prisma.document.findMany({
            select: { id: true, title: true, docType: true, summary: true, extractedData: true }
        });

        const requiredDocs = standard.requiredDocuments as any[];
        const gapReport = [];

        for (const reqDoc of requiredDocs) {
            // Simple matching logic: Check if any user doc matches the type or title fuzzily
            // Ideally, we would use LLM to match, but let's do a basic check first + LLM verification if needed.

            // For MVP: Let's ask LLM to find the best match from the list
            const match = await this.findBestDocumentMatch(reqDoc, userDocs);

            gapReport.push({
                requiredDocument: reqDoc,
                status: match ? 'FULFILLED' : 'MISSING',
                matchedDocument: match
            });
        }

        return {
            standardId: standard.id,
            standardTitle: standard.title,
            gapAnalysis: gapReport
        };
    }

    private async findBestDocumentMatch(requiredDoc: any, userDocs: any[]) {
        if (userDocs.length === 0) return null;

        const prompt = `
            I need to find if we have a document that satisfies this requirement.
            
            REQUIRED DOCUMENT:
            Title: ${requiredDoc.title}
            Type: ${requiredDoc.type}
            Description: ${requiredDoc.description}

            AVAILABLE USER DOCUMENTS:
            ${userDocs.map(d => `- ID: ${d.id}, Title: ${d.title}, Type: ${d.docType}, Summary: ${d.summary}`).join('\n')}

            Task: Return the ID of the best matching document, or "null" if none match.
            Return ONLY the ID string or "null".
        `;

        try {
            const response = await this.chat.invoke([
                new SystemMessage("You are a helpful assistant."),
                new HumanMessage(prompt)
            ]);

            const content = response.content.toString().trim();
            if (content.toLowerCase().includes('null')) return null;

            // Clean up ID if needed
            const matchedId = content.replace(/['"]/g, '');
            return userDocs.find(d => d.id === matchedId) || null;
        } catch (e) {
            return null;
        }
    }
}
