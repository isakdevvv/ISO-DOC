import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class GapReporterService {
    private readonly logger = new Logger(GapReporterService.name);
    private chat: ChatOpenAI;

    constructor(private prisma: PrismaService) {
        this.chat = new ChatOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            modelName: 'anthropic/claude-3.5-sonnet', // Strong model for report generation
            temperature: 0.2,
        });
    }

    async generateFullReport(isoStandardId: string) {
        this.logger.log(`Generating full gap report for Standard ${isoStandardId}`);

        const standard = await this.prisma.isoStandard.findUnique({ where: { id: isoStandardId } });
        if (!standard) throw new NotFoundException('ISO Standard not found');

        // 1. Fetch all Compliance Reports for this standard
        const complianceReports = await this.prisma.complianceReport.findMany({
            where: { isoStandardId },
            include: {
                document: true,
                results: true
            }
        });

        // 2. Fetch Gap Analysis (Missing Documents)
        // We can reuse the logic from ComplianceService or duplicate it here for independence.
        // For now, let's assume we have a way to get the gap analysis data.
        // Ideally, we should refactor runGapAnalysis to be reusable.
        // Let's call the ComplianceService method if possible, or reimplement lightweight version.
        // For this MVP, let's reimplement the lightweight check or just focus on the "Quality" gaps from existing reports.

        // Let's focus on aggregating the *existing* compliance reports first.

        const allResults = complianceReports.flatMap(r => r.results);
        const nonCompliant = allResults.filter(r => r.status === 'NON_COMPLIANT' || r.status === 'PARTIAL');

        // 3. Generate Executive Summary using LLM
        const summaryPrompt = `
            You are an expert ISO Consultant.
            
            Standard: ${standard.title}
            
            Findings:
            - Total Documents Analyzed: ${complianceReports.length}
            - Total Requirements Checked: ${allResults.length}
            - Non-Compliant/Partial Items: ${nonCompliant.length}
            
            Key Non-Compliance Issues:
            ${nonCompliant.map(nc => `- Requirement: "${nc.requirement}" (Status: ${nc.status}). Reasoning: ${nc.reasoning}`).join('\n').substring(0, 10000)}
            
            Task: Write a professional Executive Summary for a Gap Analysis Report.
            Include:
            1. Overall Compliance Posture (Good/Bad/Mixed)
            2. Critical Risks (based on the non-compliant items)
            3. High-level recommendations.
            
            Return format: Markdown.
        `;

        const summaryResponse = await this.chat.invoke([
            new SystemMessage("You are a senior ISO auditor writing a formal report."),
            new HumanMessage(summaryPrompt)
        ]);

        // 4. Generate Remediation Plan
        const remediationPrompt = `
            Based on the non-compliant items below, generate a step-by-step Remediation Plan.
            
            Non-Compliant Items:
            ${nonCompliant.map(nc => `- Requirement: "${nc.requirement}"`).join('\n').substring(0, 10000)}
            
            Task: Create a prioritized list of actions to fix these gaps.
            Return format: Markdown.
        `;

        const remediationResponse = await this.chat.invoke([
            new SystemMessage("You are a helpful consultant providing actionable advice."),
            new HumanMessage(remediationPrompt)
        ]);

        return {
            standardId: standard.id,
            standardTitle: standard.title,
            generatedAt: new Date(),
            statistics: {
                totalDocuments: complianceReports.length,
                totalRequirements: allResults.length,
                compliant: allResults.filter(r => r.status === 'COMPLIANT').length,
                nonCompliant: nonCompliant.length,
                score: (allResults.filter(r => r.status === 'COMPLIANT').length / allResults.length) * 100
            },
            executiveSummary: summaryResponse.content,
            remediationPlan: remediationResponse.content,
            details: nonCompliant.map(nc => ({
                requirement: nc.requirement,
                status: nc.status,
                reasoning: nc.reasoning,
                document: complianceReports.find(r => r.id === nc.complianceReportId)?.document.title
            }))
        };
    }
}
