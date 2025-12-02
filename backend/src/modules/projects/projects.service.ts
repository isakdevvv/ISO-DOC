import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import * as fs from 'fs';
import * as path from 'path';

interface FlowTaskTemplate {
    key?: string;
    title: string;
    description?: string;
    flowType?: string;
    initialStatus?: string;
    dueInDays?: number;
    metadata?: Record<string, any>;
}

interface FlowTemplate {
    name: string;
    description?: string;
    tasks?: FlowTaskTemplate[];
}

type FlowTemplateMap = Record<string, FlowTemplate>;

@Injectable()
export class ProjectsService {
    private flowTemplates: FlowTemplateMap;

    constructor(private prisma: PrismaService) {
        this.flowTemplates = this.loadFlowTemplates();
    }

    private loadFlowTemplates(): FlowTemplateMap {
        const flowsPath = path.join(process.cwd(), 'configs', 'flows', 'project-flows.json');
        try {
            const raw = fs.readFileSync(flowsPath, 'utf-8');
            return JSON.parse(raw);
        } catch (err) {
            console.warn('[ProjectsService] Could not load flow templates:', (err as Error).message);
            return {};
        }
    }

    private resolveFlow(flowKey?: string): FlowTemplate | null {
        if (!this.flowTemplates || Object.keys(this.flowTemplates).length === 0) {
            this.flowTemplates = this.loadFlowTemplates();
        }
        const key = flowKey || 'default';
        return this.flowTemplates[key] || this.flowTemplates['default'] || null;
    }

    getAvailableFlows() {
        return Object.entries(this.flowTemplates || {}).map(([key, template]) => ({
            key,
            name: template.name,
            description: template.description,
            tasks: template.tasks?.map((task) => ({
                key: task.key,
                title: task.title,
                flowType: task.flowType,
            })) || [],
        }));
    }

    async createProject(dto: CreateProjectDto) {
        const flowKey = dto.flowKey || 'default';
        const project = await this.prisma.project.create({
            data: {
                name: dto.name,
                clientName: dto.clientName,
                description: dto.description,
                flowKey,
            },
        });

        await this.seedFlowTasks(project.id, flowKey);

        return this.getProject(project.id);
    }

    private async seedFlowTasks(projectId: string, flowKey: string) {
        const flow = this.resolveFlow(flowKey);
        if (!flow?.tasks?.length) {
            return;
        }

        const now = Date.now();

        await this.prisma.documentTask.createMany({
            data: flow.tasks.map((task) => ({
                projectId,
                title: task.title,
                description: task.description,
                flowType: task.flowType || flowKey,
                status: task.initialStatus || 'PENDING',
                dueAt: task.dueInDays ? new Date(now + task.dueInDays * 24 * 60 * 60 * 1000) : null,
                metadata: task.metadata,
            })),
        });
    }

    async getProjects() {
        return this.prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                documents: true,
                tasks: {
                    orderBy: { createdAt: 'asc' },
                    include: { document: true },
                },
            },
        });
    }

    async getProject(id: string) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                documents: true,
                tasks: {
                    orderBy: { createdAt: 'asc' },
                    include: { document: true },
                },
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return project;
    }

    private async ensureProject(projectId: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
        if (!project) {
            throw new NotFoundException('Project not found');
        }
    }

    async getTasks(projectId: string) {
        await this.ensureProject(projectId);
        return this.prisma.documentTask.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
            include: { document: true },
        });
    }

    async addTask(projectId: string, dto: CreateProjectTaskDto) {
        await this.ensureProject(projectId);

        if (dto.documentId) {
            const document = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
            if (!document || document.projectId !== projectId) {
                throw new BadRequestException('Document does not belong to this project');
            }
        }

        return this.prisma.documentTask.create({
            data: {
                projectId,
                documentId: dto.documentId,
                title: dto.title,
                description: dto.description,
                flowType: dto.flowType || 'CUSTOM',
                status: dto.status || 'PENDING',
                dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
                metadata: dto.metadata,
            },
            include: { document: true },
        });
    }

    async updateTask(projectId: string, taskId: string, dto: UpdateProjectTaskDto) {
        await this.ensureProject(projectId);

        const task = await this.prisma.documentTask.findUnique({ where: { id: taskId } });
        if (!task || task.projectId !== projectId) {
            throw new NotFoundException('Task not found for this project');
        }

        if (dto.documentId) {
            const document = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
            if (!document || document.projectId !== projectId) {
                throw new BadRequestException('Document does not belong to this project');
            }
        }

        const updateData: any = {};
        if (dto.status) {
            updateData.status = dto.status;
        }
        if (dto.dueAt !== undefined) {
            updateData.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
        }
        if (dto.documentId !== undefined) {
            updateData.documentId = dto.documentId;
        }

        return this.prisma.documentTask.update({
            where: { id: taskId },
            data: updateData,
            include: { document: true },
        });
    }
}
