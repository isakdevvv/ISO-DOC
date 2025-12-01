import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../../prisma.service';

@Module({
    controllers: [ComplianceController],
    providers: [ComplianceService, PrismaService],
})
export class ComplianceModule { }
