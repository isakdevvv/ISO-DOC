import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NodeRevisionChangeType, NodeRevisionSeverity, NodeStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@/prisma.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { DeleteNodeEdgeDto, CreateNodeEdgeDto } from './dto/node-edge.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) { }

    async createProject(dto: CreateProjectDto, authTenantId?: string) {
        const tenantId = await this.resolveTenantId(dto.tenantId, authTenantId);
        const customerName = dto.customerName ?? dto.clientName ?? null;
        const siteAddress = dto.siteAddress ?? dto.address ?? null;
        const commissionedInput = dto.commissioningDate ?? dto.commissionedAt ?? null;
        const facts = this.buildFacts({
            ...dto,
            customerName: customerName ?? undefined,
            address: siteAddress ?? undefined,
            siteAddress: siteAddress ?? undefined,
        });

        const project = await this.prisma.project.create({
            data: {
                tenantId,
                externalId: dto.externalId,
                projectNumber: dto.projectNumber ?? null,
                siteName: dto.siteName ?? null,
                siteAddress,
                orderNumber: dto.orderNumber ?? null,
                offerNumber: dto.offerNumber ?? null,
                installerCompany: dto.installerCompany ?? null,
                projectManager: dto.projectManager ?? null,
                name: dto.name,
                clientName: customerName,
                address: siteAddress,
                medium: dto.medium,
                psValue: dto.psValue ?? null,
                tsValue: dto.tsValue ?? null,
                volume: dto.volume ?? null,
                commissionedAt: commissionedInput ? new Date(commissionedInput) : null,
                decommissionedAt: dto.decommissionedAt ? new Date(dto.decommissionedAt) : null,
                metadata: dto.metadata || {},
                facts,
            },
            include: this.defaultProjectInclude(),
        });

        await this.syncProjectFacts(project.id, facts);

        return project;
    }

    async updateProject(id: string, dto: UpdateProjectDto, authTenantId?: string) {
        const project = await this.ensureProject(id, authTenantId);
        const customerName = dto.customerName ?? dto.clientName ?? project.clientName ?? null;
        const siteAddress = dto.siteAddress ?? dto.address ?? project.siteAddress ?? project.address ?? null;
        const commissionedInput = dto.commissioningDate ?? dto.commissionedAt ?? undefined;
        const facts = this.buildFacts({
            ...dto,
            facts: dto.facts,
            psValue: dto.psValue ?? project.psValue ?? undefined,
            tsValue: dto.tsValue ?? project.tsValue ?? undefined,
            volume: dto.volume ?? project.volume ?? undefined,
            medium: dto.medium ?? project.medium,
            address: siteAddress ?? project.address ?? undefined,
            siteAddress: siteAddress ?? project.siteAddress ?? undefined,
            siteName: dto.siteName ?? project.siteName ?? undefined,
            projectNumber: dto.projectNumber ?? project.projectNumber ?? undefined,
            orderNumber: dto.orderNumber ?? project.orderNumber ?? undefined,
            offerNumber: dto.offerNumber ?? project.offerNumber ?? undefined,
            installerCompany: dto.installerCompany ?? project.installerCompany ?? undefined,
            projectManager: dto.projectManager ?? project.projectManager ?? undefined,
            customerName: customerName ?? undefined,
        });

        const updated = await this.prisma.project.update({
            where: { id },
            data: {
                name: dto.name,
                clientName: customerName,
                address: siteAddress,
                medium: dto.medium,
                projectNumber: dto.projectNumber ?? project.projectNumber,
                siteName: dto.siteName ?? project.siteName,
                siteAddress,
                orderNumber: dto.orderNumber ?? project.orderNumber,
                offerNumber: dto.offerNumber ?? project.offerNumber,
                installerCompany: dto.installerCompany ?? project.installerCompany,
                projectManager: dto.projectManager ?? project.projectManager,
                psValue: dto.psValue ?? project.psValue ?? null,
                tsValue: dto.tsValue ?? project.tsValue ?? null,
                volume: dto.volume ?? project.volume ?? null,
                commissionedAt: commissionedInput
                    ? new Date(commissionedInput)
                    : project.commissionedAt,
                decommissionedAt: dto.decommissionedAt ? new Date(dto.decommissionedAt) : project.decommissionedAt,
                metadata: dto.metadata ?? project.metadata,
                facts,
                status: dto.status ?? project.status,
            },
            include: this.defaultProjectInclude(),
        });

        await this.syncProjectFacts(updated.id, facts);

        return updated;
    }

    async getProjects(authTenantId?: string, requestedTenantId?: string) {
        const tenantId = await this.resolveTenantId(requestedTenantId, authTenantId);
        return this.prisma.project.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: this.defaultProjectInclude(),
        });
    }

    async getProject(id: string, authTenantId?: string) {
        return this.ensureProject(id, authTenantId, {
            include: {
                ...this.defaultProjectInclude(),
                nodes: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    async createNode(projectId: string, dto: CreateNodeDto, authTenantId?: string) {
        const project = await this.ensureProject(projectId, authTenantId);

        return this.prisma.$transaction(async (tx) => {
            const componentId = await this.resolveComponentForNode(project, dto, tx);
            const node = await tx.node.create({
                data: {
                    tenantId: project.tenantId,
                    projectId: project.id,
                    componentId,
                    type: dto.type,
                    title: dto.title,
                    templateCode: dto.templateCode,
                    templateVersion: dto.templateVersion,
                    status: dto.status ?? NodeStatus.DRAFT,
                    data: dto.data ?? {},
                    facts: dto.facts ?? {},
                    metadata: dto.metadata ?? {},
                },
            });

            const revision = await tx.nodeRevision.create({
                data: {
                    nodeId: node.id,
                    revisionNumber: 1,
                    changeType: NodeRevisionChangeType.INITIAL,
                    severity: NodeRevisionSeverity.NONE,
                    payload: dto.data ?? {},
                    summary: 'Initial node draft',
                },
            });

            await tx.node.update({
                where: { id: node.id },
                data: { currentRevisionId: revision.id },
            });

            return tx.node.findUnique({
                where: { id: node.id },
                include: {
                    component: { include: { componentType: true } },
                    revisions: {
                        orderBy: { revisionNumber: 'desc' },
                        take: 1,
                    },
                },
            });
        });
    }

    async listNodes(projectId: string, authTenantId?: string) {
        await this.ensureProject(projectId, authTenantId);
        return this.prisma.node.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                component: { include: { componentType: true } },
                revisions: {
                    orderBy: { revisionNumber: 'desc' },
                    take: 1,
                },
            },
        });
    }

    async listEdges(projectId: string, authTenantId?: string) {
        await this.ensureProject(projectId, authTenantId);
        return this.prisma.nodeEdge.findMany({
            where: {
                fromNode: { projectId },
                toNode: { projectId },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async linkNodes(projectId: string, dto: CreateNodeEdgeDto, authTenantId?: string) {
        await this.ensureProject(projectId, authTenantId);
        await Promise.all([
            this.ensureNode(dto.fromNodeId, projectId),
            this.ensureNode(dto.toNodeId, projectId),
        ]);

        return this.prisma.nodeEdge.upsert({
            where: {
                fromNodeId_toNodeId_edgeType: {
                    fromNodeId: dto.fromNodeId,
                    toNodeId: dto.toNodeId,
                    edgeType: dto.edgeType,
                },
            },
            update: {
                metadata: dto.metadata ?? Prisma.DbNull,
            },
            create: {
                fromNodeId: dto.fromNodeId,
                toNodeId: dto.toNodeId,
                edgeType: dto.edgeType,
                metadata: dto.metadata ?? Prisma.DbNull,
            },
        });
    }

    async unlinkNodes(projectId: string, dto: DeleteNodeEdgeDto, authTenantId?: string) {
        await this.ensureProject(projectId, authTenantId);
        await Promise.all([
            this.ensureNode(dto.fromNodeId, projectId),
            this.ensureNode(dto.toNodeId, projectId),
        ]);

        await this.prisma.nodeEdge.deleteMany({
            where: {
                fromNodeId: dto.fromNodeId,
                toNodeId: dto.toNodeId,
                edgeType: dto.edgeType,
            },
        });

        return { removed: true };
    }

    private async resolveTenantId(requestedTenantId?: string, authTenantId?: string) {
        if (requestedTenantId && authTenantId && requestedTenantId !== authTenantId) {
            throw new ForbiddenException('Cannot access other tenants');
        }

        if (requestedTenantId) {
            const tenant = await this.prisma.tenant.findUnique({ where: { id: requestedTenantId } });
            if (!tenant) {
                throw new NotFoundException('Tenant not found');
            }
            return tenant.id;
        }

        if (authTenantId) {
            return authTenantId;
        }

        const fallbackSlug = process.env.DEFAULT_TENANT_SLUG || 'termoteam';
        const tenant = await this.prisma.tenant.findFirst({ where: { slug: fallbackSlug } });
        if (!tenant) {
            throw new BadRequestException('tenantId is required or configure DEFAULT_TENANT_SLUG');
        }
        return tenant.id;
    }

    private buildFacts(input: {
        facts?: Record<string, any>;
        medium?: string;
        psValue?: number;
        tsValue?: number;
        volume?: number;
        address?: string;
        siteAddress?: string;
        siteName?: string;
        projectNumber?: string;
        orderNumber?: string;
        offerNumber?: string;
        installerCompany?: string;
        projectManager?: string;
        customerName?: string;
    }) {
        return {
            medium: input.medium ?? null,
            psValue: input.psValue ?? null,
            tsValue: input.tsValue ?? null,
            volume: input.volume ?? null,
            address: input.siteAddress ?? input.address ?? null,
            siteAddress: input.siteAddress ?? input.address ?? null,
            siteName: input.siteName ?? null,
            projectNumber: input.projectNumber ?? null,
            orderNumber: input.orderNumber ?? null,
            offerNumber: input.offerNumber ?? null,
            installerCompany: input.installerCompany ?? null,
            projectManager: input.projectManager ?? null,
            customerName: input.customerName ?? null,
            ...(input.facts || {}),
        };
    }

    private async syncProjectFacts(projectId: string, facts: Record<string, any>) {
        const entries = Object.entries(facts).filter(([_, value]) => value !== null && value !== undefined);

        await Promise.all(
            entries.map(([key, value]) =>
                this.prisma.projectFact.upsert({
                    where: { projectId_key: { projectId, key } },
                    update: {
                        value: value as Prisma.InputJsonValue,
                        source: 'PROJECT_METADATA',
                    },
                    create: {
                        projectId,
                        key,
                        value: value as Prisma.InputJsonValue,
                        source: 'PROJECT_METADATA',
                    },
                }),
            ),
        );
    }

    private async ensureProject(id: string, tenantId?: string, args?: Omit<Prisma.ProjectFindUniqueArgs, 'where'>) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            ...args,
        });
        if (!project || (tenantId && project.tenantId !== tenantId)) {
            throw new NotFoundException('Project not found');
        }
        return project;
    }

    private async ensureNode(id: string, projectId: string) {
        const node = await this.prisma.node.findUnique({ where: { id }, select: { id: true, projectId: true } });
        if (!node || node.projectId !== projectId) {
            throw new NotFoundException('Node not found');
        }
        return node;
    }

    private async resolveComponentForNode(
        project: { id: string; tenantId: string },
        dto: CreateNodeDto,
        tx: Prisma.TransactionClient,
    ) {
        if (dto.componentId) {
            const component = await tx.component.findFirst({
                where: { id: dto.componentId, projectId: project.id },
                select: { id: true },
            });
            if (!component) {
                throw new NotFoundException('Component not found for project');
            }
            return component.id;
        }

        if (dto.component) {
            const componentType = await tx.componentType.findUnique({ where: { code: dto.component.componentTypeCode } });
            if (!componentType) {
                throw new NotFoundException('Component type not found');
            }

            const component = await tx.component.create({
                data: {
                    tenantId: project.tenantId,
                    projectId: project.id,
                    componentTypeId: componentType.id,
                    name: dto.component.name ?? dto.title,
                    tag: dto.component.tag,
                    serialNumber: dto.component.serialNumber,
                    manufacturer: dto.component.manufacturer,
                    facts: dto.component.facts ?? {},
                    metadata: dto.component.metadata ?? {},
                },
            });

            return component.id;
        }

        return undefined;
    }

    private defaultProjectInclude(): Prisma.ProjectInclude {
        return {
            factsEntries: true,
            nodes: {
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { component: { include: { componentType: true } } },
            },
            tasks: {
                orderBy: { createdAt: 'desc' },
            },
            maintenance: {
                orderBy: { createdAt: 'desc' },
            },
            components: {
                orderBy: { createdAt: 'desc' },
                include: { componentType: true },
            },
        };
    }
}
