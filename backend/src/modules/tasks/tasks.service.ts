import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createTaskDto: CreateTaskDto) {
        let tenantId = createTaskDto.tenantId;
        if (!tenantId) {
            const project = await this.prisma.project.findUnique({
                where: { id: createTaskDto.projectId },
                select: { tenantId: true }
            });
            if (!project) {
                throw new NotFoundException('Project not found');
            }
            tenantId = project.tenantId;
        }

        return this.prisma.task.create({
            data: {
                tenantId,
                projectId: createTaskDto.projectId,
                title: createTaskDto.title,
                description: createTaskDto.description,
                type: createTaskDto.type,
                status: TaskStatus.PENDING,
                priority: createTaskDto.priority,
                dueAt: createTaskDto.dueAt,
                assigneeId: createTaskDto.assigneeId,
                nodeId: createTaskDto.nodeId,
                maintenanceEventId: createTaskDto.maintenanceEventId,
                taskTemplateId: createTaskDto.taskTemplateId,
                metadata: createTaskDto.metadata ?? {},
            },
        });
    }

    async findAll(projectId: string, status?: TaskStatus) {
        return this.prisma.task.findMany({
            where: {
                projectId,
                ...(status ? { status } : {}),
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            include: {
                assignee: true,
                node: true,
            },
        });
    }

    async findOne(id: string) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: {
                assignee: true,
                node: true,
                maintenanceEvent: true,
                runs: true,
            },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        return task;
    }

    async update(id: string, updateTaskDto: UpdateTaskDto) {
        return this.prisma.task.update({
            where: { id },
            data: updateTaskDto,
        });
    }

    async remove(id: string) {
        return this.prisma.task.delete({
            where: { id },
        });
    }
}
