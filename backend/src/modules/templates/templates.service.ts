import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
    constructor(private readonly prisma: PrismaService) { }

    create(dto: CreateTemplateDto) {
        return this.prisma.documentTemplate.create({
            data: {
                code: dto.code,
                title: dto.title,
                version: dto.version,
                description: dto.description,
                schema: dto.schema,
                metadata: dto.metadata ?? {},
            },
        });
    }

    findAll() {
        return this.prisma.documentTemplate.findMany({
            orderBy: { title: 'asc' },
        });
    }

    async findOne(id: string) {
        const template = await this.prisma.documentTemplate.findUnique({ where: { id } });
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        return template;
    }

    async update(id: string, dto: UpdateTemplateDto) {
        await this.findOne(id);
        return this.prisma.documentTemplate.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                version: dto.version,
                schema: dto.schema,
                metadata: dto.metadata,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.documentTemplate.delete({
            where: { id },
        });
    }
}
