import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RuleConflictStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { RunRuleEngineDto } from './dto/run-rule-engine.dto';
import { RuleEngineService } from './rule-engine.service';

@Controller('rule-engine')
@UseGuards(JwtAuthGuard)
export class RuleEngineController {
    constructor(private readonly ruleEngineService: RuleEngineService) { }

    @Post('projects/:projectId/run')
    runRuleEngine(@Param('projectId') projectId: string, @Body() dto: RunRuleEngineDto) {
        return this.ruleEngineService.runRuleEngine(projectId, dto);
    }

    @Get('projects/:projectId/requirements/latest')
    async getLatestRequirements(@Param('projectId') projectId: string) {
        const requirements = await this.ruleEngineService.getLatestRequirements(projectId);
        if (!requirements) {
            throw new NotFoundException('No requirements model found for this project');
        }
        return requirements;
    }

    @Get('projects/:projectId/requirements')
    listRequirements(@Param('projectId') projectId: string, @Query('limit') limit?: string) {
        const parsedLimit = limit ? Math.min(Number(limit), 50) : 10;
        return this.ruleEngineService.listRequirements(projectId, parsedLimit);
    }

    @Get('projects/:projectId/evaluations')
    listEvaluations(@Param('projectId') projectId: string, @Query('limit') limit?: string) {
        const parsedLimit = limit ? Math.min(Number(limit), 50) : 10;
        return this.ruleEngineService.listEvaluations(projectId, parsedLimit);
    }

    @Get('projects/:projectId/conflicts')
    listConflicts(
        @Param('projectId') projectId: string,
        @Query('status') status?: string,
    ) {
        const normalizedStatus = status ? status.toUpperCase() as RuleConflictStatus : undefined;
        return this.ruleEngineService.listConflicts(projectId, normalizedStatus);
    }

    @Get('projects/:projectId/overrides')
    listOverrides(@Param('projectId') projectId: string) {
        return this.ruleEngineService.listOverrides(projectId);
    }

    @Get('rule-sets')
    listRuleSets(@Query('projectId') projectId?: string) {
        return this.ruleEngineService.listRuleSets(projectId);
    }

    @Post('conflicts/:id/resolve')
    resolveConflict(
        @Param('id') id: string,
        @Body() body: { resolution: 'OVERRIDE_A' | 'OVERRIDE_B' | 'IGNORE'; notes?: string },
    ) {
        // TODO: Get userId from request context
        const userId = 'default-user-id';
        return this.ruleEngineService.resolveConflict(id, { ...body, userId });
    }
}
