import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    providers: [IngestionService, PrismaService],
    exports: [IngestionService],
})
export class IngestionModule { }
