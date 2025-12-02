import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { NodesModule } from '../nodes/nodes.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
    imports: [NodesModule, IngestionModule, ApiKeysModule],
    controllers: [PublicApiController],
    providers: [PublicApiService],
})
export class PublicApiModule { }
