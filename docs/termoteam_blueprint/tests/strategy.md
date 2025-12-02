# Test Strategy

## Levels
1. **Unit**
   - Rule evaluation (conditions/outcomes, conflict detection)
   - Node DAG helpers (cycle prevention, relation updates)
   - Template rendering + field validation

2. **Integration**
   - Ingestion → file_variants creation
   - Rule Engine + Document Builder + Task flow for FDV/CE
   - Maintenance event ingestion → tasks → node revisions

3. **E2E**
   - Cypress/Playwright scenario: opprett prosjekt → last opp filer → generer FDV/CE → godkjenn → generer kundemappe.
   - Maintenance scenario: send API event → se tasks → oppdater FDV.

4. **Snapshot Tests**
   - For maler og regelsett – sikre at kritiske JSON-strukturer ikke endres utilsiktet.

5. **Load & Rate**
   - Test API keys mot rate limits og soft/hard cutoff.
   - Stress vedlikeholds-API (hundre events/mnd) + task queue.

## Tooling
- Vitest/Jest for unit.
- Supertest for API integration.
- Playwright + Supabase test DB for E2E.
- GitHub Actions workflows: lint, unit, integration, e2e (nightly).
