import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
    AuditActionStatus,
    AuditChecklistStatus,
    AuditStatus,
} from '@prisma/client';

import { PrismaService } from '@/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';

@Injectable()
export class AuditsService {
    constructor(private readonly prisma: PrismaService) { }

    async listAudits(authTenantId?: string, requestedTenantId?: string) {
        const tenantId = await this.resolveTenantId(requestedTenantId, authTenantId);
        return this.prisma.audit.findMany({
            where: { tenantId },
            orderBy: { startDate: 'desc' },
            include: this.defaultAuditInclude(),
        });
    }

    async getAudit(id: string, authTenantId?: string) {
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: this.defaultAuditInclude(),
        });
        if (!audit) {
            throw new NotFoundException('Audit not found');
        }
        if (authTenantId && audit.tenantId !== authTenantId) {
            throw new ForbiddenException('Access denied for audit');
        }
        return audit;
    }

    async createAudit(dto: CreateAuditDto, authTenantId?: string) {
        const tenantId = await this.resolveTenantId(dto.tenantId, authTenantId);
        const projectId = await this.resolveProject(dto.projectId, tenantId);

        const audit = await this.prisma.audit.create({
            data: {
                tenantId,
                projectId,
                name: dto.name,
                standard: dto.standard,
                type: dto.type,
                scope: dto.scope,
                owner: dto.owner,
                status: dto.status ?? AuditStatus.PLANNED,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                metadata: dto.metadata ?? {},
                checklist: dto.checklist?.length
                    ? {
                        create: dto.checklist.map((item, index) => ({
                            clause: item.clause,
                            title: item.title,
                            owner: item.owner,
                            status: item.status ?? AuditChecklistStatus.COMPLIANT,
                            notes: item.notes,
                            orderIndex: item.orderIndex ?? index,
                        })),
                    }
                    : undefined,
                findings: dto.findings?.length
                    ? {
                        create: dto.findings.map((finding) => ({
                            title: finding.title,
                            severity: finding.severity ?? undefined,
                            owner: finding.owner,
                            dueDate: finding.dueDate ? new Date(finding.dueDate) : undefined,
                            status: finding.status ?? AuditStatus.PLANNED,
                            description: finding.description,
                        })),
                    }
                    : undefined,
                actions: dto.actions?.length
                    ? {
                        create: dto.actions.map((action) => ({
                            title: action.title,
                            owner: action.owner,
                            status: action.status ?? AuditActionStatus.OPEN,
                            dueDate: action.dueDate ? new Date(action.dueDate) : undefined,
                            description: action.description,
                        })),
                    }
                    : undefined,
            },
            include: this.defaultAuditInclude(),
        });

        return audit;
    }

    private async resolveTenantId(requestedTenantId?: string, authTenantId?: string) {
        if (requestedTenantId) {
            return requestedTenantId;
        }
        if (authTenantId) {
            return authTenantId;
        }
        throw new ForbiddenException('Tenant context missing');
    }

    private async resolveProject(projectId: string | undefined, tenantId: string) {
        if (!projectId) {
            return undefined;
        }
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, tenantId: true },
        });
        if (!project) {
            throw new NotFoundException('Project not found');
        }
        if (project.tenantId !== tenantId) {
            throw new ForbiddenException('Project does not belong to tenant');
        }
        return project.id;
    }

    private defaultAuditInclude() {
        return {
            checklist: {
                orderBy: { orderIndex: 'asc' },
            },
            findings: {
                orderBy: { createdAt: 'desc' },
            },
            actions: {
                orderBy: { createdAt: 'asc' },
            },
            project: {
                select: { id: true, name: true },
            },
        };
    }
}
