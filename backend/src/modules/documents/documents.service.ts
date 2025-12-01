import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Document, Prisma } from '@prisma/client';

@Injectable()
export class DocumentsService {
    constructor(private prisma: PrismaService) { }

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
}
