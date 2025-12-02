# Vision & Rollout

## Mission
Give TermoTeam (and similar HVAC/kulde entreprenører) et plug-and-play verktøy som genererer, lagrer og reviderer CE/PED/FDV/risiko-dokumentasjon med full sporbarhet. AI skal aldri gjette – den skal bruke godkjente kilder, spørre brukeren når informasjon mangler, og logge absolutt alt.

## Verdibudskap
1. **Tidsbesparelse** – montører/prosjektledere bruker minutter, ikke dager, på dokumentasjon.
2. **Kvalitet & revisjon** – alt har revisjonspor, snapshot og kilde-ID; lett å vise Kiwa/tilsyn.
3. **Arkiv & eierskap** – kunden velger arkivlengde (hot/cold), TermoTeam tar betalt for policyen.
4. **Flerparts-samarbeid** – noder kan deles via API-nøkler med kunder og leverandører uten å miste kontroll.

## Faseplan
1. **Fase 1 – Core dokumentasjon (3–4 mnd)**
   - EU/TEK17/RAG ingestion
   - Prosjekt-setup, node-DAG, tasks, CopilotKit i dashboard
   - FDV/Risk/CE generering + manuell godkjenning
2. **Fase 2 – Vedlikehold & kundemappe (2–3 mnd)**
   - Maintenance API + auto tasks
   - MAINTENANCE_HISTORY nodes og FDV-revisjoner
   - Kundemappe-generator og eksport
3. **Fase 3 – Regelstudio & automatisert re-evaluering (3+ mnd)**
   - Full Rule Studio (admin)
   - Kunde-spesifikke krav & overrides
   - Automatisk re-check når regelverk endres

## Arkivering
| Policy | Hot Storage | Cold Storage | Prisidé |
|--------|-------------|--------------|---------|
| Basic  | 5 år        | Til dekom +5 | Lav     |
| Plus   | 10 år       | Til dekom +10| Middels |
| Premium| 15 år       | Til dekom +15| Høy     |

Hot = rask tilgang for Copilot; Cold = S3 Glacier/arkiv med indekser beholdt.
