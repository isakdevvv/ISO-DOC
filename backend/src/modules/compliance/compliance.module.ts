import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../prisma.service';

import { GapReporterService } from './gap-reporter.service';

@Module({
    controllers: [ComplianceController],
    providers: [ComplianceService, GapReporterService, PrismaService],
})
export class ComplianceModule { }
