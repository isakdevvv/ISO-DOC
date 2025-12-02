import { Injectable, NotFoundException } from '@nestjs/common';
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

    async createDocument(data: Prisma.DocumentCreateInput, projectId?: string): Promise<Document> {
        const createData: Prisma.DocumentCreateInput = { ...data };

        if (projectId && !createData.project) {
            createData.project = {
                connect: { id: projectId }
            };
        }

        const document = await this.prisma.document.create({
            data: createData,
        });

        if (projectId) {
            await this.ensureProjectTask(projectId, document);
        }

        return document;
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
        const document = await this.prisma.document.findUnique({ where });
        if (!document) {
            throw new NotFoundException('Document not found');
        }

        await this.prisma.documentTask.deleteMany({ where: { documentId: document.id } });

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

    private async ensureProjectTask(projectId: string, document: Document) {
        await this.prisma.documentTask.upsert({
            where: { documentId: document.id },
            update: {
                title: document.title,
                description: 'Dokumentet er klart til å fylles ut når analysen er ferdig.',
                flowType: 'DOCUMENT',
            },
            create: {
                projectId,
                documentId: document.id,
                title: document.title,
                description: 'Dokumentet er klart til å fylles ut når analysen er ferdig.',
                flowType: 'DOCUMENT',
                status: 'PENDING',
            },
        });
    }
}
