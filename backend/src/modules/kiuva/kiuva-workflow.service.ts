import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';

export interface KiuvaSignature {
    userId: string;
    timestamp: Date;
    notes?: string;
}

export interface KiuvaStatus {
    utforelse?: string; // userId
    verifikasjon?: string; // userId
    godkjenning?: string; // userId
}

export interface KiuvaSignatures {
    utforelse?: KiuvaSignature;
    verifikasjon?: KiuvaSignature;
    godkjenning?: KiuvaSignature;
}

export type KiuvaRole = 'utforelse' | 'verifikasjon' | 'godkjenning';

@Injectable()
export class KiuvaWorkflowService {
    private readonly logger = new Logger(KiuvaWorkflowService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Sign a Kiuva role for a node (utførelse, verifikasjon, or godkjenning)
     */
    async signRole(nodeId: string, role: KiuvaRole, userId: string, notes?: string) {
        const node = await this.prisma.node.findUnique({
            where: { id: nodeId },
        });

        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        // Validate sequential approval
        const currentStatus = (node.kiuvaStatus as KiuvaStatus) || {};
        const currentSignatures = (node.kiuvaSignatures as KiuvaSignatures) || {};

        this.validateSequentialApproval(role, currentStatus);
        this.validateDifferentUsers(role, userId, currentSignatures);

        // Update status and signatures
        const newStatus: KiuvaStatus = {
            ...currentStatus,
            [role]: userId,
        };

        const newSignatures: KiuvaSignatures = {
            ...currentSignatures,
            [role]: {
                userId,
                timestamp: new Date(),
                notes,
            },
        };

        await this.prisma.node.update({
            where: { id: nodeId },
            data: {
                kiuvaStatus: newStatus as any,
                kiuvaSignatures: newSignatures as any,
            },
        });

        this.logger.log(`Kiuva ${role} signed for node ${nodeId} by user ${userId}`);

        return {
            nodeId,
            role,
            status: newStatus,
            signatures: newSignatures,
        };
    }

    /**
     * Approve utførelse step
     */
    async approveUtforelse(nodeId: string, userId: string, notes?: string) {
        return this.signRole(nodeId, 'utforelse', userId, notes);
    }

    /**
     * Approve verifikasjon step (requires utførelse to be complete)
     */
    async approveVerifikasjon(nodeId: string, userId: string, notes?: string) {
        return this.signRole(nodeId, 'verifikasjon', userId, notes);
    }

    /**
     * Approve godkjenning step (requires verifikasjon to be complete)
     */
    async approveGodkjenning(nodeId: string, userId: string, notes?: string) {
        return this.signRole(nodeId, 'godkjenning', userId, notes);
    }

    /**
     * Get the current Kiuva signature status for a node
     */
    async getSignatureStatus(nodeId: string) {
        const node = await this.prisma.node.findUnique({
            where: { id: nodeId },
            select: {
                id: true,
                title: true,
                status: true,
                kiuvaStatus: true,
                kiuvaSignatures: true,
            },
        });

        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        const status = (node.kiuvaStatus as KiuvaStatus) || {};
        const signatures = (node.kiuvaSignatures as KiuvaSignatures) || {};

        return {
            nodeId: node.id,
            title: node.title,
            nodeStatus: node.status,
            kiuvaStatus: status,
            kiuvaSignatures: signatures,
            isComplete: this.isKiuvaComplete(status),
            nextRequiredRole: this.getNextRequiredRole(status),
        };
    }

    /**
     * Validate that all three Kiuva signatures are present
     */
    async validateKiuvaComplete(nodeId: string): Promise<boolean> {
        const node = await this.prisma.node.findUnique({
            where: { id: nodeId },
            select: { kiuvaStatus: true },
        });

        if (!node) {
            throw new NotFoundException(`Node ${nodeId} not found`);
        }

        const status = (node.kiuvaStatus as KiuvaStatus) || {};
        return this.isKiuvaComplete(status);
    }

    /**
     * Reset Kiuva signatures for a node (admin function)
     */
    async resetKiuvaSignatures(nodeId: string) {
        await this.prisma.node.update({
            where: { id: nodeId },
            data: {
                kiuvaStatus: null,
                kiuvaSignatures: null,
            },
        });

        this.logger.log(`Kiuva signatures reset for node ${nodeId}`);
        return { nodeId, reset: true };
    }

    // Private helper methods

    private validateSequentialApproval(role: KiuvaRole, currentStatus: KiuvaStatus) {
        if (role === 'verifikasjon' && !currentStatus.utforelse) {
            throw new BadRequestException(
                'Verifikasjon kan ikke signeres før utførelse er godkjent',
            );
        }

        if (role === 'godkjenning' && !currentStatus.verifikasjon) {
            throw new BadRequestException(
                'Godkjenning kan ikke signeres før verifikasjon er godkjent',
            );
        }
    }

    private validateDifferentUsers(
        role: KiuvaRole,
        userId: string,
        currentSignatures: KiuvaSignatures,
    ) {
        // Check that the same user is not signing multiple roles
        const roles: KiuvaRole[] = ['utforelse', 'verifikasjon', 'godkjenning'];

        for (const existingRole of roles) {
            if (existingRole !== role && currentSignatures[existingRole]?.userId === userId) {
                throw new BadRequestException(
                    `Samme bruker kan ikke signere flere Kiuva-roller. Bruker ${userId} har allerede signert ${existingRole}`,
                );
            }
        }
    }

    private isKiuvaComplete(status: KiuvaStatus): boolean {
        return !!(status.utforelse && status.verifikasjon && status.godkjenning);
    }

    private getNextRequiredRole(status: KiuvaStatus): KiuvaRole | null {
        if (!status.utforelse) return 'utforelse';
        if (!status.verifikasjon) return 'verifikasjon';
        if (!status.godkjenning) return 'godkjenning';
        return null; // All complete
    }
}
