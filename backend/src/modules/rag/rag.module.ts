import { Module } from '@nestjs/common';

import { AiModule } from '@/common/ai/ai.module';
import { ProcessingModule } from '@/common/processing/processing.module';
import { DocumentIndexingService } from './document-indexing.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
    imports: [AiModule, ProcessingModule],
    controllers: [RagController],
    providers: [RagService, DocumentIndexingService],
    exports: [RagService, DocumentIndexingService],
})
export class RagModule { }
