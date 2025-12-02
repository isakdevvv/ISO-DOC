import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Node, NodeStatus, Prisma } from '@prisma/client';

@Injectable()
export class NodesService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.NodeCreateInput): Promise<Node> {
        return this.prisma.node.create({ data });
    }

    async findAll(projectId: string): Promise<Node[]> {
        return this.prisma.node.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string): Promise<Node> {
        const node = await this.prisma.node.findUnique({
            where: { id },
            include: {
                files: true,
                currentRevision: {
                    include: {
                        snapshot: {
                            include: {
                                segments: {
                                    include: { provenance: true },
                                    orderBy: { orderIndex: 'asc' },
                                },
                            },
                        },
                    },
                },
                outboundEdges: { include: { toNode: true } },
                inboundEdges: { include: { fromNode: true } },
            },
        });
        if (!node) {
            throw new NotFoundException(`Node with ID ${id} not found`);
        }
        return node;
    }

    async update(id: string, data: Prisma.NodeUpdateInput): Promise<Node> {
        return this.prisma.node.update({
            where: { id },
            data,
        });
    }

    async remove(id: string): Promise<Node> {
        return this.prisma.node.delete({
            where: { id },
        });
    }

    async linkNodes(fromNodeId: string, toNodeId: string, edgeType: string, metadata?: Prisma.InputJsonValue) {
        return this.prisma.nodeEdge.create({
            data: {
                fromNodeId,
                toNodeId,
                edgeType,
                metadata: metadata ?? Prisma.DbNull,
            },
        });
    }

    async removeLink(fromNodeId: string, toNodeId: string, edgeType: string) {
        return this.prisma.nodeEdge.deleteMany({
            where: {
                fromNodeId,
                toNodeId,
                edgeType,
            },
        });
    }

    async getRevisions(nodeId: string) {
        return this.prisma.nodeRevision.findMany({
            where: { nodeId },
            orderBy: { revisionNumber: 'desc' },
            include: {
                snapshot: true,
            },
        });
    }

    async getRevision(nodeId: string, revisionId: string) {
        return this.prisma.nodeRevision.findUnique({
            where: { id: revisionId },
            include: {
                snapshot: {
                    include: {
                        segments: {
                            include: { provenance: true },
                            orderBy: { orderIndex: 'asc' },
                        },
                    },
                },
            },
        });
    }
}
