# Copilot Personas & Intents

## 1. Global Project Copilot
- **State**: tenant, project meta, nodesSummary, tasksSummary, maintenanceSummary, complianceSummary.
- **Intents**: statusforklaring, opprette tasks, kjøre regelmotor, anbefale neste steg, åpne node/task.
- **Actions**: `runRuleEngine`, `createTasksForProject`, `openNode`, `openTask`, `createDefaultNodes`.

## 2. Node/Document Copilot
- **State**: node (type, status, template, data), requirementsModel, provenance summary.
- **Intents**: generere felt, forklare kilder, markere "needs input", sende node til review.
- **Actions**: `regenerateField`, `markFieldNeedsInput`, `submitNodeForReview`, `openSnapshot`.

## 3. Maintenance Copilot
- **State**: maintenance events, tasks knyttet til events, nodesSummary.
- **Intents**: oppsummere vedlikehold, foreslå tasks, linke events til noder.
- **Actions**: `createMaintenanceTasks`, `linkEventToNode`, `openNode`, `openTask`.

## 4. Rule/Admin Copilot
- **State**: ruleSets, rules, conflicts, testProjectFacts.
- **Intents**: lage/endre regler, forklare hits, simulere, håndtere overrides.
- **Actions**: `createRule`, `updateRule`, `createRuleOverride`, `runRuleSimulation`, `openConflict`.
