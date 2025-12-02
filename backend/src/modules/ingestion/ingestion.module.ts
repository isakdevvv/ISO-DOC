import { Module } from '@nestjs/common';

import { StorageModule } from '@/common/storage/storage.module';
import { PrismaService } from '@/prisma.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { IngestionQueueService } from './ingestion.queue';

@Module({
    imports: [StorageModule],
    controllers: [IngestionController],
    providers: [IngestionService, PrismaService, IngestionQueueService],
    exports: [IngestionService],
})
export class IngestionModule { }
