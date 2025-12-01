import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma.service';

import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
    imports: [IngestionModule],
    controllers: [DocumentsController],
    providers: [DocumentsService, PrismaService],
})

export class DocumentsModule { }
