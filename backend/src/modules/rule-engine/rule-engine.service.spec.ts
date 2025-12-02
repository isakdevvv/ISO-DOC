import { RuleConflictStatus } from '@prisma/client';
import { RuleEngineService } from './rule-engine.service';

describe('RuleEngineService helpers', () => {
    let service: RuleEngineService;

    beforeEach(() => {
        service = new RuleEngineService({} as any);
    });

    it('evaluates nested conditions correctly', () => {
        const evaluateCondition = (service as any).evaluateCondition.bind(service);
        const facts = { medium: 'CO2', psValue: 350, volume: 20 };
        const condition = {
            all: [
                { fact: 'medium', operator: 'eq', value: 'co2' },
                { fact: 'psValue', operator: 'gte', value: 300 },
            ],
        };

        expect(evaluateCondition(condition, facts)).toBe(true);
        expect(evaluateCondition({ fact: 'volume', operator: 'lt', value: 10 }, facts)).toBe(false);
    });

    it('detects outcome conflicts for matching conflict keys', () => {
        const detectConflicts = (service as any).detectConflicts.bind(service);
        const conflicts = detectConflicts([
            {
                ruleId: 'rule-a',
                ruleCode: 'RULE_A',
                outcome: { type: 'REQUIRED_DOCUMENT', templateCode: 'FDV', value: 'full' },
            },
            {
                ruleId: 'rule-b',
                ruleCode: 'RULE_B',
                outcome: { type: 'REQUIRED_DOCUMENT', templateCode: 'FDV', value: 'lite' },
            },
        ]);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].conflictType).toBe('OUTCOME_MISMATCH');
        expect(conflicts[0].status).toBe(RuleConflictStatus.OPEN);
        expect(conflicts[0].ruleACode).toBe('RULE_A');
        expect(conflicts[0].ruleBCode).toBe('RULE_B');
    });

    it('builds requirements payload buckets from rule hits', () => {
        const buildRequirementsModel = (service as any).buildRequirementsModel.bind(service);
        const payload = buildRequirementsModel([
            {
                ruleCode: 'DOC_RULE',
                severity: 'HIGH',
                outcome: { type: 'REQUIRED_DOCUMENT', templateCode: 'FDV' },
                metadata: { ruleSetTitle: 'EU' },
            },
            {
                ruleCode: 'FIELD_RULE',
                outcome: { type: 'REQUIRED_FIELD', path: 'fdv.title', description: 'Title' },
            },
            {
                ruleCode: 'TASK_RULE',
                outcome: { type: 'TASK', taskType: 'REQUEST_INFO', title: 'Collect data' },
            },
        ], { medium: 'CO2' });

        expect(payload.requiredDocuments).toHaveLength(1);
        expect(payload.requiredDocuments[0].code).toBe('FDV');
        expect(payload.requiredFields).toHaveLength(1);
        expect(payload.tasks).toHaveLength(1);
        expect(payload.ruleHits).toHaveLength(3);
        expect(payload.factsSnapshot.medium).toBe('CO2');
    });
});
