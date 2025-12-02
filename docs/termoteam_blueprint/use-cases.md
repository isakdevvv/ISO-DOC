# Use Cases & Actors

## Primæraktører
- **TermoTeam Admin** – setter regler, maler, arkivpolicy, API-nøkler.
- **Prosjektleder/Montør** – oppretter prosjekt, laster opp filer, kjører oppgaver, godkjenner dokumenter.
- **Kunde** – får kundemappe (read-only node via API / eksport), kan laste opp egne standarder.
- **Ekstern leverandør** – kan sende vedlikeholdsdata via API nøkkel.

## Hovedscenarier
1. **Nytt CO₂-prosjekt**
   - Opprett prosjekt → ingest filer → kjør regelmotor → generer FDV/CE/Risk → godkjenn → lag kundemappe.
2. **Vedlikehold via API**
   - Ekstern montør sender rapport → auto tasks → AI fyller vedlikeholdsrapport → FDV oppdateres → bruker godkjenner.
3. **Regelendring**
   - Admin endrer/legger til regel → plattform foreslår re-evaluering av aktive prosjekter → nye tasks/reruns.
4. **Compliance review**
   - Bruker åpner prosjekt → ser DAG, timeline, snapshot, conflicts, “VARSEL” → eksporter rapport.
5. **Kundens dokumentbibliotek**
   - Kundemappe-node genererer zip/pdf → node kan deles via begrenset API-nøkkel.

## Godkjenning & sporbarhet
- Hver dokumentnode må manuelt godkjennes.
- Alle overrides flagges som “VARSEL”.
- Timeline viser ALT (prosjektskapelse, tasks, vedlikehold, revisjoner, eksport).
