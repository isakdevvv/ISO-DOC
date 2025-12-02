import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RagModule } from './modules/rag/rag.module';
import { RuleEngineModule } from './modules/rule-engine/rule-engine.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { DatabaseModule } from './database.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule.register({ isGlobal: true }),
        DatabaseModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        AuthModule,
        IngestionModule,
        ProjectsModule,
        RuleEngineModule,
        TemplatesModule,
        NodesModule,
        RagModule,
        MaintenanceModule,
        TasksModule,
        ApiKeysModule,
        PublicApiModule,
        TenantsModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
