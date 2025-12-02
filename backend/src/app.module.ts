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
import { ProjectsModule } from './modules/projects/projects.module';
import { TemplatesModule } from './modules/templates/templates.module';

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
        ProjectsModule,
        TemplatesModule,
    ],
    controllers: [],
    providers: [PrismaService],
})
export class AppModule { }
