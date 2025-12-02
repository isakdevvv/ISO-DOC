import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);
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

    async search(query: string) {
        this.logger.log(`Searching for: ${query}`);

        // 1. Generate Embedding for the query
        const embedding = await this.embeddings.embedQuery(query);

        // 2. Vector Search (Semantic)
        // Using Prisma raw query for pgvector
        const vectorResults = await this.prisma.$queryRaw`
            SELECT 
                dc."documentId",
                dc."content",
                dc."pageNumber",
                1 - (dc."embedding" <=> ${embedding}::vector) as similarity,
                d."title",
                d."status"
            FROM "DocumentChunk" dc
            JOIN "Document" d ON dc."documentId" = d."id"
            WHERE 1 - (dc."embedding" <=> ${embedding}::vector) > 0.5
            ORDER BY similarity DESC
            LIMIT 5;
        `;

        // 3. Keyword Search (Exact Match)
        // Using Prisma's full text search or simple contains
        const keywordResults = await this.prisma.documentChunk.findMany({
            where: {
                content: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            include: {
                document: {
                    select: { title: true, status: true }
                }
            },
            take: 5
        });

        return {
            vectorResults,
            keywordResults
        };
    }
}
