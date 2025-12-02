import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DocumentsModule } from './modules/documents/documents.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';

import { IsoStandardsModule } from './modules/iso-standards/iso-standards.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { RedisModule } from './modules/redis/redis.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaService } from './prisma.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        DocumentsModule,
        IngestionModule,
        SearchModule,
        DashboardModule,
        ComplianceModule,
        NotificationsModule,
        IsoStandardsModule,
    ],
    controllers: [],
    providers: [PrismaService],
})
export class AppModule { }
