import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { IsoIngestionService } from './services/iso-ingestion.service';

@Injectable()
export class IsoStandardsService {
    constructor(
        private prisma: PrismaService,
        private ingestionService: IsoIngestionService,
    ) { }

    async create(file: Express.Multer.File, standardId: string) {
        console.log('IsoStandardsService.create called');
        const isoStandard = await this.prisma.isoStandard.create({
            data: {
                title: file.originalname,
                filePath: file.path,
                standardId: standardId,
                status: 'PENDING',
            },
        });

        // Trigger async ingestion
        this.ingestionService.ingestStandard(isoStandard.id).catch(err => {
            console.error('Background ingestion failed', err);
        });

        return isoStandard;
    }

    async findAll() {
        return this.prisma.isoStandard.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const standard = await this.prisma.isoStandard.findUnique({
            where: { id },
            include: { chunks: true },
        });
        if (!standard) {
            throw new NotFoundException(`ISO Standard with ID ${id} not found`);
        }
        return standard;
    }
}
