import { Injectable } from '@nestjs/common';
import { NodesService } from '../nodes/nodes.service';
import { IngestionService } from '../ingestion/ingestion.service';

@Injectable()
export class PublicApiService {
    constructor(
        private readonly nodesService: NodesService,
        private readonly ingestionService: IngestionService,
    ) { }

    async getNode(id: string) {
        return this.nodesService.findOne(id);
    }

    // Add more public methods as needed
}
