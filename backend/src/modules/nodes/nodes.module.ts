import { Module } from '@nestjs/common';
import { DocumentBuilderModule } from '@/modules/document-builder/document-builder.module';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';

@Module({
    imports: [DocumentBuilderModule],
    controllers: [NodesController],
    providers: [NodesService],
    exports: [NodesService],
})
export class NodesModule { }
