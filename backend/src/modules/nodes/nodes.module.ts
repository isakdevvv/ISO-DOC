import { Module } from '@nestjs/common';
import { DocumentBuilderModule } from '@/modules/document-builder/document-builder.module';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { PrismaService } from '../../prisma.service';

@Module({
    imports: [DocumentBuilderModule],
    controllers: [NodesController],
    providers: [NodesService, PrismaService],
    exports: [NodesService],
})
export class NodesModule { }
