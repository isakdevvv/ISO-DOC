import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DocumentsModule } from './modules/documents/documents.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';

import { IsoStandardsModule } from './modules/iso-standards/iso-standards.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        RedisModule,
        DocumentsModule,
        IngestionModule,
        IsoStandardsModule,
        ComplianceModule
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
