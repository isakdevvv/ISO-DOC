import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) { }

    @Post('check/:documentId')
    async checkCompliance(
        @Param('documentId') documentId: string,
        @Body('isoStandardId') isoStandardId: string,
    ) {
        return this.complianceService.checkCompliance(documentId, isoStandardId);
    }

    @Get('reports/:id')
    async getReport(@Param('id') id: string) {
        return this.complianceService.getReport(id);
    }
    @Get('gap-analysis/:isoStandardId')
    async runGapAnalysis(@Param('isoStandardId') isoStandardId: string) {
        return this.complianceService.runGapAnalysis(isoStandardId);
    }
}
