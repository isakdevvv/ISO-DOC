export class RunRuleEngineDto {
    scope?: string;
    /**
     * Facts override merged with stored project facts before evaluation.
     */
    facts?: Record<string, any>;
    /**
     * Limit evaluation to these rule set IDs. Defaults to all active rule sets for the project/tenant.
     */
    ruleSetIds?: string[];
    /**
     * Optional user ID that triggered the run (used for audit metadata).
     */
    triggeredByUserId?: string;
    /**
     * Additional metadata captured in the evaluation summary.
     */
    metadata?: Record<string, any>;
}
