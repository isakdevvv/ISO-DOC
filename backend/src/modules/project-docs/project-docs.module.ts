import { Module } from '@nestjs/common';

import { ProjectDocsController } from './project-docs.controller';
import { ProjectDocsService } from './project-docs.service';
import { AiClientFactory } from '@/common/ai/ai-client.factory';

@Module({
    controllers: [ProjectDocsController],
    providers: [ProjectDocsService, AiClientFactory],
})
export class ProjectDocsModule { }
