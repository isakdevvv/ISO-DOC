import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../../prisma.service';

@Module({
    providers: [IngestionService, PrismaService],
    exports: [IngestionService],
})
export class IngestionModule { }
