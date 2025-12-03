import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { KiuvaWorkflowService } from './kiuva-workflow.service';
import { KiuvaController } from './kiuva.controller';

@Module({
    controllers: [KiuvaController],
    providers: [KiuvaWorkflowService, PrismaService],
    exports: [KiuvaWorkflowService],
})
export class KiuvaModule { }
