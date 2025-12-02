import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { PrismaService } from '@/prisma.service';

import { NodesModule } from '../nodes/nodes.module';
import { TasksModule } from '../tasks/tasks.module';
import { AiClientFactory } from '@/common/ai/ai-client.factory';

@Module({
    imports: [NodesModule, TasksModule],
    controllers: [MaintenanceController],
    providers: [MaintenanceService, PrismaService, AiClientFactory],
    exports: [MaintenanceService],
})
export class MaintenanceModule { }
