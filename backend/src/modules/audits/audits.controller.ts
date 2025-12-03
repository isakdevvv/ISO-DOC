import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CreateAuditDto } from './dto/create-audit.dto';
import { AuditsService } from './audits.service';

interface AuthenticatedRequest extends Request {
    user?: {
        tenantId?: string;
    };
}

@ApiTags('audits')
@ApiBearerAuth()
@Controller('audits')
@UseGuards(JwtAuthGuard)
export class AuditsController {
    constructor(private readonly auditsService: AuditsService) { }

    @Get()
    @ApiOperation({ summary: 'List audits with checklist/findings/actions' })
    list(@Query('tenantId') tenantId: string | undefined, @Req() req: AuthenticatedRequest) {
        return this.auditsService.listAudits(this.getTenant(req), tenantId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get audit with full details' })
    get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.auditsService.getAudit(id, this.getTenant(req));
    }

    @Post()
    @ApiOperation({ summary: 'Create an audit with optional checklist/findings/actions' })
    create(@Body() dto: CreateAuditDto, @Req() req: AuthenticatedRequest) {
        return this.auditsService.createAudit(dto, this.getTenant(req));
    }

    private getTenant(req: AuthenticatedRequest) {
        return req.user?.tenantId;
    }
}
