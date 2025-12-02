import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Document, Prisma } from '@prisma/client';
import { IngestionService } from '../ingestion/ingestion.service';

@Injectable()
export class DocumentsService {
    constructor(
        private prisma: PrismaService,
        private ingestionService: IngestionService,
    ) { }

    async document(
        documentWhereUniqueInput: Prisma.DocumentWhereUniqueInput,
    ): Promise<Document | null> {
        return this.prisma.document.findUnique({
            where: documentWhereUniqueInput,
        });
    }

    async documents(params: {
        skip?: number;
        take?: number;
        cursor?: Prisma.DocumentWhereUniqueInput;
        where?: Prisma.DocumentWhereInput;
        orderBy?: Prisma.DocumentOrderByWithRelationInput;
    }): Promise<Document[]> {
        const { skip, take, cursor, where, orderBy } = params;
        return this.prisma.document.findMany({
            skip,
            take,
            cursor,
            where,
            orderBy,
        });
    }

    async createDocument(data: Prisma.DocumentCreateInput): Promise<Document> {
        return this.prisma.document.create({
            data,
        });
    }

    async updateDocument(params: {
        where: Prisma.DocumentWhereUniqueInput;
        data: Prisma.DocumentUpdateInput;
    }): Promise<Document> {
        const { where, data } = params;
        return this.prisma.document.update({
            data,
            where,
        });
    }

    async deleteDocument(where: Prisma.DocumentWhereUniqueInput): Promise<Document> {
        return this.prisma.document.delete({
            where,
        });
    }

    async getBatchStats(batchId: string) {
        const stats = await this.prisma.document.groupBy({
            by: ['status'],
            where: { batchId },
            _count: {
                id: true
            }
        });

        const total = stats.reduce((acc, curr) => acc + curr._count.id, 0);
        const processed = stats.find(s => s.status === 'STAGED')?._count.id || 0;
        const failed = stats.find(s => s.status === 'ERROR')?._count.id || 0;
        const pending = stats.find(s => s.status === 'UPLOADING' || s.status === 'PENDING')?._count.id || 0;

        return {
            batchId,
            total,
            processed,
            failed,
            pending
        };
    }
}
