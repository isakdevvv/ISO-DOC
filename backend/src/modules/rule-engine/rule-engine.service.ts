import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Prisma, RuleConflictStatus, RuleEvaluationStatus, RuleOverride, RuleSetScope } from '@prisma/client';
import { PrismaService } from '@/prisma.service';
import { RunRuleEngineDto } from './dto/run-rule-engine.dto';

type ProjectWithFacts = Prisma.ProjectGetPayload<{
    include: { factsEntries: true };
}>;

type RuleSetWithRules = Prisma.RuleSetGetPayload<{
    include: { rules: { include: { sources: true } } };
}>;

interface EvaluatedRuleHit {
    ruleId?: string;
    ruleCode?: string;
    severity?: string | null;
    outcome: Record<string, any>;
    metadata?: Record<string, any>;
}

export interface ConflictDraft {
    ruleAId?: string;
    ruleACode?: string;
    ruleBId?: string;
    ruleBCode?: string;
    conflictType: string;
    status: RuleConflictStatus;
    message?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class RuleEngineService {
    private readonly logger = new Logger(RuleEngineService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async runRuleEngine(projectId: string, dto: RunRuleEngineDto) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { factsEntries: true },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        const scope = dto.scope || 'FULL';
        const facts = this.buildFacts(project, dto.facts);

        const evaluation = await this.prisma.ruleEvaluation.create({
            data: {
                projectId,
                scope,
                status: RuleEvaluationStatus.RUNNING,
                facts,
                createdById: dto.triggeredByUserId,
                summary: {
                    triggeredBy: dto.triggeredByUserId || 'system',
                    ruleSetFilter: dto.ruleSetIds || null,
                    ...dto.metadata,
                },
            },
        });

        try {
            const [ruleSets, overrides, currentModel] = await Promise.all([
                this.fetchRuleSets(project, dto.ruleSetIds),
                this.prisma.ruleOverride.findMany({
                    where: { projectId },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.requirementsModel.findFirst({
                    where: { projectId },
                    orderBy: { createdAt: 'desc' },
                    select: { version: true },
                }),
            ]);

            const overrideMap = new Map<string, RuleOverride>(overrides.map((item) => [item.ruleId, item]));
            const evaluatedHits = this.evaluateRules(ruleSets, facts, overrideMap);
            const conflicts = this.detectConflicts(evaluatedHits);
            const warnings = [
                ...this.buildInitialWarnings(facts),
                ...(ruleSets.length === 0 ? [{
                    type: 'MISSING_RULESETS',
                    message: 'No active rule sets available for this project',
                }] : []),
            ];
            const requirementsPayload = this.buildRequirementsModel(evaluatedHits, facts);
            const nextVersion = (currentModel?.version ?? 0) + 1;

            const requirementsModel = await this.prisma.$transaction(async (tx) => {
                if (evaluatedHits.length > 0) {
                    await tx.ruleHit.createMany({
                        data: evaluatedHits.map((hit) => ({
                            ruleEvaluationId: evaluation.id,
                            ruleId: hit.ruleId,
                            ruleCode: hit.ruleCode,
                            severity: hit.severity,
                            outcome: hit.outcome,
                            metadata: hit.metadata || {},
                        })),
                    });
                }

                if (conflicts.length > 0) {
                    await tx.ruleConflict.createMany({
                        data: conflicts.map((conflict) => ({
                            ruleEvaluationId: evaluation.id,
                            ruleAId: conflict.ruleAId,
                            ruleACode: conflict.ruleACode,
                            ruleBId: conflict.ruleBId,
                            ruleBCode: conflict.ruleBCode,
                            conflictType: conflict.conflictType,
                            status: conflict.status,
                            message: conflict.message,
                            metadata: conflict.metadata || {},
                        })),
                    });
                }

                const requirement = await tx.requirementsModel.create({
                    data: {
                        projectId,
                        scope,
                        payload: requirementsPayload,
                        version: nextVersion,
                        warnings,
                        unresolvedConflicts: conflicts.map((conflict) => ({
                            ruleACode: conflict.ruleACode,
                            ruleBCode: conflict.ruleBCode,
                            conflictType: conflict.conflictType,
                            message: conflict.message,
                            status: conflict.status,
                        })),
                        createdById: dto.triggeredByUserId,
                        ruleEvaluationId: evaluation.id,
                        metadata: {
                            generatedBy: 'rule-engine',
                            scope,
                            status: 'DRAFT',
                        },
                    },
                    include: {
                        ruleEvaluation: {
                            select: {
                                id: true,
                                scope: true,
                                status: true,
                                startedAt: true,
                            },
                        },
                    },
                });

                await tx.ruleEvaluation.update({
                    where: { id: evaluation.id },
                    data: {
                        status: RuleEvaluationStatus.COMPLETED,
                        completedAt: new Date(),
                        summary: {
                            ...(dto.metadata || {}),
                            hits: evaluatedHits.length,
                            conflicts: conflicts.length,
                            warnings: warnings.length,
                            ruleSets: ruleSets.length,
                        },
                    },
                });

                return requirement;
            });

            return {
                evaluationId: evaluation.id,
                requirementsModel,
                summary: {
                    hits: evaluatedHits.length,
                    conflicts: conflicts.length,
                    warnings: warnings.length,
                    ruleSets: ruleSets.length,
                },
                warnings,
                conflicts,
            };
        } catch (error) {
            await this.prisma.ruleEvaluation.update({
                where: { id: evaluation.id },
                data: {
                    status: RuleEvaluationStatus.FAILED,
                    completedAt: new Date(),
                    summary: {
                        ...(dto.metadata || {}),
                        error: error.message,
                    },
                },
            });

            this.logger.error(`Rule engine run failed for project ${projectId}`, error.stack || error.message);
            throw error;
        }
    }

    async getLatestRequirements(projectId: string) {
        return this.prisma.requirementsModel.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                ruleEvaluation: true,
            },
        });
    }

    async listRequirements(projectId: string, limit = 10) {
        return this.prisma.requirementsModel.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                ruleEvaluation: true,
            },
        });
    }

    async listEvaluations(projectId: string, limit = 10) {
        return this.prisma.ruleEvaluation.findMany({
            where: { projectId },
            orderBy: { startedAt: 'desc' },
            take: limit,
            include: {
                requirements: true,
            },
        });
    }

    async listConflicts(projectId: string, status?: RuleConflictStatus) {
        const where: Prisma.RuleConflictWhereInput = {
            evaluation: { projectId },
        };

        if (status) {
            where.status = status;
        }

        return this.prisma.ruleConflict.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                resolvedBy: true,
            },
        });
    }

    async listOverrides(projectId: string) {
        return this.prisma.ruleOverride.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                rule: true,
                createdBy: true,
            },
        });
    }

    async listRuleSets(projectId?: string, forceRefresh = false) {
        const cacheKey = `rulesets:${projectId || 'global'}`;
        if (forceRefresh) {
            await this.invalidateRuleSetCache(projectId);
        } else {
            const cached = await this.cacheManager.get<RuleSetWithRules[]>(cacheKey);
            if (cached) {
                this.logger.log(`Cache hit for ${cacheKey}`);
                return cached;
            }
        }

        this.logger.log(`Cache miss for ${cacheKey}`);

        const where: Prisma.RuleSetWhereInput = {
            isActive: true,
            OR: [
                { scope: RuleSetScope.GLOBAL },
            ],
        };

        if (projectId) {
            const project = await this.prisma.project.findUnique({ where: { id: projectId } });
            if (project) {
                where.OR!.push({ tenantId: project.tenantId });
                where.OR!.push({ projectId: project.id });
            }
        }

        const result = await this.prisma.ruleSet.findMany({
            where,
            orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
            include: {
                rules: true,
            },
        });

        await this.cacheManager.set(cacheKey, result, 3600000); // 1 hour
        return result;
    }

    async invalidateRuleSetCache(projectId?: string) {
        const keys = new Set<string>();
        keys.add('rulesets:global');
        if (projectId) {
            keys.add(`rulesets:${projectId}`);
        }
        for (const key of keys) {
            await this.cacheManager.del(key);
        }
    }

    private buildFacts(project: ProjectWithFacts, overrides?: Record<string, any>) {
        const facts: Record<string, any> = {
            projectId: project.id,
            tenantId: project.tenantId,
            medium: project.medium,
            psValue: project.psValue,
            volume: project.volume,
            address: project.address,
            clientName: project.clientName,
            status: project.status,
        };

        if (project.metadata && typeof project.metadata === 'object') {
            Object.assign(facts, project.metadata as Record<string, any>);
        }

        if (project.facts && typeof project.facts === 'object') {
            Object.assign(facts, project.facts as Record<string, any>);
        }

        for (const entry of project.factsEntries) {
            facts[entry.key] = entry.value;
        }

        if (overrides) {
            Object.assign(facts, overrides);
        }

        return facts;
    }

    private async fetchRuleSets(project: ProjectWithFacts, ruleSetIds?: string[]) {
        const where: Prisma.RuleSetWhereInput = {
            isActive: true,
            OR: [
                { scope: RuleSetScope.GLOBAL },
                { tenantId: project.tenantId },
                { projectId: project.id },
            ],
        };

        if (ruleSetIds?.length) {
            where.id = { in: ruleSetIds };
        }

        return this.prisma.ruleSet.findMany({
            where,
            orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
            include: {
                rules: {
                    include: { sources: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    }

    private evaluateRules(ruleSets: RuleSetWithRules[], facts: Record<string, any>, overrides: Map<string, RuleOverride>) {
        const hits: EvaluatedRuleHit[] = [];

        for (const ruleSet of ruleSets) {
            for (const rule of ruleSet.rules) {
                const override = overrides.get(rule.id);
                if (this.shouldSkipRule(override)) {
                    continue;
                }

                const condition = this.normalizeJson<Record<string, any>>(rule.condition);
                if (!this.evaluateCondition(condition, facts)) {
                    continue;
                }

                const outcome = this.resolveOutcome(rule, override);

                hits.push({
                    ruleId: rule.id,
                    ruleCode: rule.code,
                    severity: rule.severity,
                    outcome: {
                        ...outcome,
                        ruleCode: rule.code,
                    },
                    metadata: {
                        ruleSetId: ruleSet.id,
                        ruleSetCode: ruleSet.code,
                        ruleSetScope: ruleSet.scope,
                        ruleSetTitle: ruleSet.title,
                        sources: rule.sources,
                        overrideId: override?.id,
                    },
                });
            }
        }

        return hits;
    }

    private evaluateCondition(condition: Record<string, any> | null | undefined, facts: Record<string, any>): boolean {
        if (!condition || Object.keys(condition).length === 0) {
            return true;
        }

        if (Array.isArray(condition.all)) {
            return condition.all.every((child) => this.evaluateCondition(child, facts));
        }

        if (Array.isArray(condition.any)) {
            return condition.any.some((child) => this.evaluateCondition(child, facts));
        }

        if (condition.not) {
            return !this.evaluateCondition(condition.not, facts);
        }

        const factKey = condition.fact || condition.field;
        if (!factKey) {
            return true;
        }

        const operator = (condition.operator || condition.op || 'eq').toLowerCase();
        const factValue = facts[factKey];
        const target = condition.value ?? condition.equals ?? condition.match;

        switch (operator) {
            case 'eq':
            case 'equals':
            case '==':
                return this.compareValues(factValue, target) === 0;
            case 'neq':
            case 'not_equals':
                return this.compareValues(factValue, target) !== 0;
            case 'gt':
                return Number(factValue) > Number(target);
            case 'gte':
            case 'min':
                return Number(factValue) >= Number(target);
            case 'lt':
                return Number(factValue) < Number(target);
            case 'lte':
            case 'max':
                return Number(factValue) <= Number(target);
            case 'in':
            case 'includes':
                if (!Array.isArray(target)) {
                    return false;
                }
                return target.map((value) => this.normalizeValue(value)).includes(this.normalizeValue(factValue));
            case 'nin':
            case 'excludes':
                if (!Array.isArray(target)) {
                    return true;
                }
                return !target.map((value) => this.normalizeValue(value)).includes(this.normalizeValue(factValue));
            case 'contains':
                if (Array.isArray(factValue)) {
                    return factValue.map((value) => this.normalizeValue(value)).includes(this.normalizeValue(target));
                }
                if (typeof factValue === 'string') {
                    return factValue.toLowerCase().includes(String(target).toLowerCase());
                }
                return false;
            case 'exists':
                return factValue !== undefined && factValue !== null && factValue !== '';
            default:
                return true;
        }
    }

    private detectConflicts(hits: EvaluatedRuleHit[]): ConflictDraft[] {
        const groups = new Map<string, EvaluatedRuleHit[]>();

        for (const hit of hits) {
            const conflictKey = this.resolveConflictKey(hit);
            if (!conflictKey) {
                continue;
            }
            const group = groups.get(conflictKey) || [];
            group.push(hit);
            groups.set(conflictKey, group);
        }

        const conflicts: ConflictDraft[] = [];

        for (const [key, group] of groups.entries()) {
            if (group.length < 2) {
                continue;
            }

            const uniqueValues = new Set(group.map((hit) => JSON.stringify(this.extractConflictValue(hit))));
            if (uniqueValues.size <= 1) {
                continue;
            }

            for (let i = 0; i < group.length - 1; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    conflicts.push({
                        ruleAId: group[i].ruleId,
                        ruleACode: group[i].ruleCode,
                        ruleBId: group[j].ruleId,
                        ruleBCode: group[j].ruleCode,
                        conflictType: 'OUTCOME_MISMATCH',
                        status: RuleConflictStatus.OPEN,
                        message: `Rules ${group[i].ruleCode} and ${group[j].ruleCode} disagree for ${key}`,
                        metadata: {
                            conflictKey: key,
                            ruleAOutcome: group[i].outcome,
                            ruleBOutcome: group[j].outcome,
                        },
                    });
                }
            }
        }

        return conflicts;
    }

    private buildRequirementsModel(hits: EvaluatedRuleHit[], facts: Record<string, any>) {
        const payload = {
            factsSnapshot: facts,
            requiredDocuments: [] as any[],
            requiredFields: [] as any[],
            tasks: [] as any[],
            flags: [] as any[],
            notes: [] as any[],
            ruleHits: hits.map((hit) => ({
                ruleCode: hit.ruleCode,
                severity: hit.severity,
                outcomeType: hit.outcome?.type || hit.outcome?.category,
                metadata: hit.metadata,
            })),
        };

        for (const hit of hits) {
            const outcome = hit.outcome || {};
            const type = (outcome.type || outcome.category || '').toUpperCase();

            switch (type) {
                case 'REQUIRED_DOCUMENT':
                case 'DOCUMENT':
                    payload.requiredDocuments.push({
                        code: outcome.templateCode || outcome.documentCode || outcome.code || hit.ruleCode,
                        title: outcome.title || hit.metadata?.ruleSetTitle || hit.ruleCode,
                        severity: hit.severity,
                        sources: hit.metadata?.sources || [],
                        data: outcome,
                    });
                    break;
                case 'REQUIRED_FIELD':
                case 'FIELD':
                    payload.requiredFields.push({
                        path: outcome.path || outcome.field,
                        templateCode: outcome.templateCode,
                        required: outcome.required !== false,
                        description: outcome.description,
                        severity: hit.severity,
                        data: outcome,
                    });
                    break;
                case 'TASK':
                    payload.tasks.push({
                        type: outcome.taskType || outcome.code || hit.ruleCode,
                        title: outcome.title,
                        description: outcome.description,
                        data: outcome,
                    });
                    break;
                case 'FLAG':
                    payload.flags.push({
                        level: outcome.level || hit.severity || 'INFO',
                        message: outcome.message,
                        data: outcome,
                    });
                    break;
                case 'WARNING':
                    payload.notes.push({
                        type: 'WARNING',
                        message: outcome.message,
                        data: outcome,
                    });
                    break;
                default:
                    payload.notes.push({
                        type: outcome.type || 'INFO',
                        message: outcome.description || outcome.message || `Rule ${hit.ruleCode} applied`,
                        data: outcome,
                    });
            }
        }

        return payload;
    }

    private buildInitialWarnings(facts: Record<string, any>) {
        const warnings = [];
        const requiredFacts = ['medium', 'psValue', 'volume'];
        const missing = requiredFacts.filter((key) => facts[key] === undefined || facts[key] === null);
        if (missing.length > 0) {
            warnings.push({
                type: 'MISSING_FACTS',
                message: `Missing core facts: ${missing.join(', ')}`,
                keys: missing,
            });
        }

        return warnings;
    }

    private normalizeJson<T = Record<string, any>>(value: Prisma.JsonValue | null | undefined): T {
        if (!value) {
            return {} as T;
        }
        if (typeof value === 'object') {
            return value as T;
        }
        try {
            return JSON.parse(String(value)) as T;
        } catch {
            return {} as T;
        }
    }

    private shouldSkipRule(override?: RuleOverride) {
        if (!override) {
            return false;
        }
        if (override.status?.toUpperCase() === 'DISABLED') {
            return true;
        }
        const metadata = this.normalizeJson<Record<string, any>>(override.metadata);
        return metadata?.action === 'DISABLE_RULE';
    }

    private resolveOutcome(rule: RuleSetWithRules['rules'][number], override?: RuleOverride) {
        const outcome = this.normalizeJson<Record<string, any>>(rule.outcome);
        if (!override) {
            return outcome;
        }
        const metadata = this.normalizeJson<Record<string, any>>(override.metadata);
        if (metadata?.forcedOutcome) {
            return {
                ...outcome,
                ...metadata.forcedOutcome,
                overrideId: override.id,
            };
        }
        if (metadata?.adjustment) {
            return {
                ...outcome,
                ...metadata.adjustment,
                overrideId: override.id,
            };
        }
        return outcome;
    }

    private resolveConflictKey(hit: EvaluatedRuleHit) {
        const outcome = hit.outcome || {};
        return outcome.conflictKey || outcome.templateCode || outcome.documentCode || outcome.field || null;
    }

    private extractConflictValue(hit: EvaluatedRuleHit) {
        const outcome = hit.outcome || {};
        return outcome.value ?? outcome.level ?? outcome;
    }

    private normalizeValue(value: any) {
        if (value === undefined || value === null) {
            return value;
        }
        if (typeof value === 'string') {
            return value.toLowerCase();
        }
        return value;
    }

    async resolveConflict(
        conflictId: string,
        dto: {
            resolution: 'OVERRIDE_A' | 'OVERRIDE_B' | 'IGNORE';
            notes?: string;
            userId: string;
        },
    ) {
        const conflict = await this.prisma.ruleConflict.findUnique({
            where: { id: conflictId },
            include: { evaluation: true },
        });

        if (!conflict) {
            throw new NotFoundException('Conflict not found');
        }

        if (conflict.status === RuleConflictStatus.RESOLVED) {
            return conflict;
        }

        return this.prisma.$transaction(async (tx) => {
            let override: RuleOverride | null = null;

            if (dto.resolution === 'OVERRIDE_A' && conflict.ruleAId) {
                override = await tx.ruleOverride.create({
                    data: {
                        projectId: conflict.evaluation.projectId,
                        ruleId: conflict.ruleAId,
                        status: 'ACTIVE',
                        notes: dto.notes || `Resolved conflict ${conflict.id} by overriding Rule A`,
                        createdById: dto.userId,
                        metadata: {
                            action: 'DISABLE_RULE',
                            reason: 'CONFLICT_RESOLUTION',
                            conflictId: conflict.id,
                        },
                    },
                });
            } else if (dto.resolution === 'OVERRIDE_B' && conflict.ruleBId) {
                override = await tx.ruleOverride.create({
                    data: {
                        projectId: conflict.evaluation.projectId,
                        ruleId: conflict.ruleBId,
                        status: 'ACTIVE',
                        notes: dto.notes || `Resolved conflict ${conflict.id} by overriding Rule B`,
                        createdById: dto.userId,
                        metadata: {
                            action: 'DISABLE_RULE',
                            reason: 'CONFLICT_RESOLUTION',
                            conflictId: conflict.id,
                        },
                    },
                });
            }

            const updatedConflict = await tx.ruleConflict.update({
                where: { id: conflictId },
                data: {
                    status: dto.resolution === 'IGNORE' ? RuleConflictStatus.IGNORED : RuleConflictStatus.RESOLVED,
                    resolvedByOverrideId: override?.id,
                    resolvedAt: new Date(),
                    message: dto.notes,
                },
            });

            return updatedConflict;
        });
    }

    private compareValues(a: any, b: any) {
        const left = this.normalizeValue(a);
        const right = this.normalizeValue(b);
        if (left === right) {
            return 0;
        }
        if (left > right) {
            return 1;
        }
        return -1;
    }
}
