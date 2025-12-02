import { Module } from '@nestjs/common';

import { RagModule } from '@/modules/rag/rag.module';
import { PrismaService } from '@/prisma.service';
import { DocumentBuilderService } from './document-builder.service';

@Module({
    imports: [RagModule],
    providers: [DocumentBuilderService, PrismaService],
    exports: [DocumentBuilderService],
})
export class DocumentBuilderModule { }
