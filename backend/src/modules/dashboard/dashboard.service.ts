import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats() {
        const totalDocuments = await this.prisma.document.count();
        const analyzedDocuments = await this.prisma.document.count({
            where: { status: 'ANALYZED' }
        });

        const reports = await this.prisma.complianceReport.findMany({
            select: { overallScore: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const avgScore = reports.length > 0
            ? reports.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / reports.length
            : 0;

        const recentActivity = await this.prisma.document.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, status: true, updatedAt: true }
        });

        return {
            totalDocuments,
            analyzedDocuments,
            averageComplianceScore: Math.round(avgScore),
            recentActivity
        };
    }
}
