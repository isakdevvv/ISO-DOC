import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma, NodeApiKey, ApiKeyScope } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
    constructor(private prisma: PrismaService) { }

    private generateToken(): string {
        return `sk_iso_${crypto.randomBytes(24).toString('hex')}`;
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async create(data: {
        tenantId: string;
        projectId?: string;
        nodeId?: string;
        name: string;
        scope: ApiKeyScope;
        accessLevel?: string;
        expiresAt?: Date;
    }): Promise<{ apiKey: NodeApiKey; token: string }> {
        const token = this.generateToken();
        const tokenHash = this.hashToken(token);

        const apiKey = await this.prisma.nodeApiKey.create({
            data: {
                tenantId: data.tenantId,
                projectId: data.projectId,
                nodeId: data.nodeId,
                name: data.name,
                tokenHash,
                scope: data.scope,
                accessLevel: data.accessLevel || 'READ',
                expiresAt: data.expiresAt,
            },
        });

        return { apiKey, token };
    }

    async findAll(tenantId: string, projectId?: string) {
        return this.prisma.nodeApiKey.findMany({
            where: {
                tenantId,
                projectId,
                isActive: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async revoke(id: string) {
        return this.prisma.nodeApiKey.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async validateKey(token: string): Promise<NodeApiKey | null> {
        const tokenHash = this.hashToken(token);
        const apiKey = await this.prisma.nodeApiKey.findUnique({
            where: { tokenHash },
        });

        if (!apiKey || !apiKey.isActive) {
            return null;
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return null;
        }

        // Update last used
        await this.prisma.nodeApiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        });

        return apiKey;
    }
}
