import { Module } from '@nestjs/common';
import { IsoStandardsController } from './iso-standards.controller';
import { IsoStandardsService } from './iso-standards.service';
import { IsoIngestionService } from './services/iso-ingestion.service';
import { PrismaService } from '../../prisma.service';

@Module({
    controllers: [IsoStandardsController],
    providers: [IsoStandardsService, IsoIngestionService, PrismaService],
    exports: [IsoStandardsService],
})
export class IsoStandardsModule { }
