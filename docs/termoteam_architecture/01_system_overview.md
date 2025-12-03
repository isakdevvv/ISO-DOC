# TermoTeam Dokumentasjonsplattform - Systemarkitektur

## 1. Overordnet Konsept
Dette er en modulær, node-basert plattform designet for å automatisere, strukturere og vedlikeholde teknisk dokumentasjon (FDV, CE, Internkontroll) for tekniske entreprenører (TermoTeam).

Kjerneprinsipper:
- **Node-basert (DAG):** Alt innhold (dokumenter, komponenter, oppgaver, vedlikehold) er noder som henger sammen i en rettet graf.
- **Regelstyrt:** En sentral regelmotor styrer hvilke noder som kreves basert på prosjektfakta og lovverk (EU/TEK17).
- **Sporbarhet (Traceability):** Hver setning og beslutning kan spores tilbake til kilde (lov, manual, regel) og tidspunkt (snapshot).
- **Levende dokumentasjon:** Dokumenter er ikke statiske PDF-er, men dynamiske objekter som oppdateres via vedlikeholdshendelser.

## 2. Hovedmoduler

### A. Ingestion & Library Service
Ansvarlig for å ta imot filer, normalisere dem og gjøre dem tilgjengelige for AI.
- **Input:** PDF, Bilder, E-post, ZIP, API-kall.
- **Prosess:**
  1. Lagre originalfil (Immutable).
  2. Generere normaliserte varianter (PDF/A, JSON, Text).
  3. Chunking & Embedding til Vektor-database.
  4. Klassifisering (FDV, Manual, Sertifikat).

### B. Node Engine (DAG)
Hjernen som holder styr på relasjoner.
- **Noder:** FDV, CE, RiskAssessment, Component, MaintenanceEvent, Task.
- **Kanter (Edges):** `DEPENDS_ON`, `GENERATES`, `UPDATES`, `SUMMARIZES`.
- **Versjonering:** Alle endringer på en node lagres som en revisjon (`node_revisions`).

### C. Rule Engine (Regelmotor)
Bestemmer hva som er "rett".
- **Input:** Prosjektfakta (Medium=CO2, PS=60bar) + Regelbibliotek (EU, TEK17, Bedriftskrav).
- **Output:** Kravmodell (Hvilke dokumenter/felt mangler?).
- **Konflikthåndtering:** Flagger motstridende regler (f.eks. Kunde vs EU) og logger brukers valg.

### D. Maintenance Engine
Håndterer livsløpet til anlegget.
- **Event Log:** Mottar `maintenance_events` (Service utført, del byttet).
- **Auto-Trigger:** Oppretter automatisk `Tasks` basert på events (f.eks. "Oppdater FDV etter komponentbytte").
- **API Gateway:** Rate-limited inngang for eksterne montører/systemer.

### E. AI Orchestration (Agents)
- **Node Orchestrator:** Planlegger og utfører oppgaver ved å kalle andre verktøy.
- **Document Builder:** Genererer innhold i dokumentnoder basert på maler og RAG.
- **Compliance Validator:** Sjekker at innholdet matcher reglene.

## 3. Dataflyt (High Level)

1. **Oppsett:** Bedrift definerer Kravbibliotek (Regler + Maler).
2. **Prosjektstart:** Bruker oppretter prosjekt -> Regelmotor definerer påkrevde noder (Placeholder DAG).
3. **Ingestion:** Bruker laster opp filer -> Systemet klassifiserer og kobler dem til noder.
4. **Generering:** AI fyller ut noder (Draft) -> Bruker godkjenner (Approved).
5. **Drift:** 
   - Montør sender vedlikeholdsrapport (API).
   - Maintenance Engine logger event.
   - Task opprettes: "Revider FDV".
   - AI oppdaterer FDV-utkast -> Bruker godkjenner.
   - Ny revisjon av FDV er live.

## 4. Teknisk Stack
- **Backend:** NestJS (Node.js)
- **Database:** PostgreSQL + Supabase (Auth, Realtime, Vector)
- **AI:** OpenAI (GPT-4o) / Anthropic (Claude 3.5 Sonnet) via Vercel AI SDK
- **Frontend:** Next.js + React Flow (for DAG-visning) + Shadcn UI

## 5. Sikkerhet & Arkivering
- **API Security:** API-nøkler per node med scopes og rate-limiting.
- **Arkiv:** Policy-basert lagring (Hot/Cold) basert på anleggets levetid.
- **Audit:** Full logg av alle API-kall og brukerhandlinger.
