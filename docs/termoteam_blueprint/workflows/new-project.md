# Workflow: New CO₂ Project Setup

1. **Opprett prosjekt**
   - Input: navn, adresse, kunde, medium, PS, volum, kunde-type, arkivpolicy.
   - Auto: lag `PROJECT_METADATA` node + default `COMPONENT` placeholders.

2. **Importer filer**
   - Bruker laster opp manualer, tegninger, sjekklister.
   - Ingestion lagrer original + varianter, klassifiserer, knytter til komponentnoder.

3. **Generer noder**
   - Standard noder opprettes: `FDV`, `CE_PED`, `RISK`, `MAINTENANCE_HISTORY`, `CUSTOMER_FOLDER` (empty), `RULE_SET_REF`.

4. **Kjør regelmotor**
   - Rule Engine evaluerer fakta → `requirements_model` + ev. `unresolved_conflicts`.

5. **Oppgaver**
   - Task Orchestrator lager tasks: `GENERATE_FDV`, `GENERATE_CE_PED`, `GENERATE_CO2_RISK`, `GENERATE_CUSTOMER_FOLDER`.

6. **Dokumentgenerering**
   - Dokumentagent fyller maler → noder settes til `pending_review`.

7. **Godkjenning**
   - Bruker ser diff, provenance, warnings → godkjenner eller ber om endring.

8. **Kundemappe**
   - Når FDV/CE/Risk approved → kundemappe-node bygges + eksport (zip/pdf) → node kan deles via API-nøkkel.

9. **Compliance report**
   - Generer rapport med liste over regler, dokumenter, varsel, arkivpolicy.
