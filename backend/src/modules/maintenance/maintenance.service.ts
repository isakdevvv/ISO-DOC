import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { CreateMaintenanceEventDto } from './dto/create-maintenance-event.dto';
import { MaintenanceEventStatus, MaintenanceEventSource } from '@prisma/client';

import { NodesService } from '../nodes/nodes.service';
import { TasksService } from '../tasks/tasks.service';
import { AiClientFactory } from '@/common/ai/ai-client.factory';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class MaintenanceService {
    private readonly logger = new Logger(MaintenanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly nodesService: NodesService,
        private readonly tasksService: TasksService,
        private readonly aiClientFactory: AiClientFactory,
    ) { }

    async createEvent(dto: CreateMaintenanceEventDto) {
        const project = await this.prisma.project.findUnique({
            where: { id: dto.projectId },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        const event = await this.prisma.maintenanceEvent.create({
            data: {
                tenantId: project.tenantId,
                projectId: dto.projectId,
                source: dto.source as MaintenanceEventSource || MaintenanceEventSource.INTERNAL_APP,
                eventType: dto.eventType || 'SERVICE',
                status: MaintenanceEventStatus.RECEIVED,
                rawPayload: dto.payload || {},
                performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
                performedBy: dto.performedBy,
            },
        });

        // Trigger AI Agent for processing
        this.processEvent(event.id).catch(err =>
            this.logger.error(`Failed to process event ${event.id}`, err.stack)
        );

        return event;
    }

    async findAll(projectId: string) {
        return this.prisma.maintenanceEvent.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                documents: true,
                tasks: true,
            },
        });
    }

    private async processEvent(eventId: string) {
        const event = await this.prisma.maintenanceEvent.findUnique({
            where: { id: eventId },
            include: { attachments: { include: { variants: true } } },
        });

        if (!event) return;

        await this.prisma.maintenanceEvent.update({
            where: { id: eventId },
            data: { status: MaintenanceEventStatus.PARSED }, // Using PARSED as 'PROCESSING' equivalent
        });

        const chat = this.aiClientFactory.getChatModel();
        const systemPrompt = `You are the Maintenance Ingestion Agent.
        
        Input:
        ${JSON.stringify({
            event_id: event.id,
            raw_text: JSON.stringify(event.rawPayload),
            // In a real scenario, we would fetch text content from file variants here
        })}
        
        Output JSON format:
        {
          "node_data": { "template_id": "MAINTENANCE_REPORT_V1", "fields": { ... } },
          "suggested_tasks": [ { "code": "TASK_CODE", "reason": "..." } ],
          "status": "APPROVED" | "NEEDS_REVIEW"
        }`;

        try {
            const response = await chat.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage("Process this event."),
            ]);

            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            const result = this.parseJson(content);

            if (result.node_data) {
                await this.nodesService.create({
                    tenant: { connect: { id: event.tenantId } },
                    project: { connect: { id: event.projectId } },
                    type: 'MAINTENANCE_REPORT',
                    title: `Maintenance Report - ${event.performedAt.toISOString().split('T')[0]}`,
                    status: result.status === 'APPROVED' ? 'APPROVED' : 'DRAFT',
                    data: result.node_data,
                });
            }

            if (result.suggested_tasks && Array.isArray(result.suggested_tasks)) {
                for (const task of result.suggested_tasks) {
                    await this.tasksService.create({
                        tenantId: event.tenantId,
                        projectId: event.projectId,
                        title: `Follow-up: ${task.code}`,
                        description: task.reason,
                        type: task.code,
                        maintenanceEventId: event.id,
                    });
                }
            }

            await this.prisma.maintenanceEvent.update({
                where: { id: eventId },
                data: { status: MaintenanceEventStatus.COMPLETED },
            });

        } catch (error) {
            this.logger.error(`AI Processing failed: ${error.message}`);
            await this.prisma.maintenanceEvent.update({
                where: { id: eventId },
                data: { status: MaintenanceEventStatus.NEEDS_REVIEW },
            });
        }
    }

    private parseJson(text: string) {
        try {
            // Simple cleanup for markdown code blocks
            const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch {
            return {};
        }
    }
}
