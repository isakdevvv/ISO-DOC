# Project Copilot (Sprint 1 Skeleton)

Agent C eksponerer prosjektdata via `useProjectCopilotState` (se `frontend/lib/copilot/projectState.ts`) og setter systemprompt i `app/app/projects/[id]/page.tsx`. Prompten er identisk med `ui/copilot-prompts/project-orchestrator.md` og lastes inn i runtime ved å kalle `setChatInstructions(PROJECT_COPILOT_PROMPT)`.

## State som deles med Copilot

```ts
{
  tenantId,
  projectId,
  projectMeta: {
    name, clientName, location, medium, ps, ts, volume, status, commissionedAt
  },
  nodesSummary: [
    { id, title, type, status, templateId, parentId }
  ],
  tasksSummary: [
    { id, title, type, status, nodeId, maintenanceEventId }
  ],
  maintenanceSummary: [
    { id, eventType, status, performedAt, nodeId }
  ],
  complianceSummary: {
    health, missingDocuments, unresolvedConflicts
  },
  missingFields // optional liste over prosjektfelt som mangler verdi
}
```

Frontend fyller `nodesSummary` fra faktiske noder når API svarer, ellers fra lokale komponentfixtures slik at Copilot kan teste flows før backend er klar.

## Handlinger

| Action                | Beskrivelse | Handler |
|-----------------------|-------------|---------|
| `checkProjectReadiness` | Returnerer manglende prosjektfelt, komponenter som ikke er `READY`, samt dokument-noder som mangler grunnlag. | Lokal analyse av state (`missingFields`, `components`, `dagDocumentNodes`). |
| `openUpload` | Klikker på skjult `<input type="file">` i prosjekt-UI. | Trigger `document.getElementById('project-upload').click()`. |
| `openComponentEditor` | Scroll til komponentregisteret og forhåndsvelg type/forelder basert på Copilot-argumenter. | Setter `componentForm` + `scrollIntoView`. |
| `createProject` | Fra `app/app/projects/page.tsx` (Sprint 0), beholdes for onboarding. | Kaller `createProject` API. |

Alle handlinger ligger i klienten (`useCopilotAction`) og krever ingen backend-endringer i Sprint 1.

## API-bruk
- Komponentregisteret henter faktiske noder via `GET /projects/:id/nodes` og mapper metadata til trevisningen/DAG.
- Når en komponent legges til i UI, sendes den til `POST /projects/:id/nodes` (inkl. `componentTypeCode`) slik at backend oppretter node + komponent. Statusendring i tabellen bruker `PATCH /nodes/:id`.

## Hvor brukes den?

- `frontend/app/app/projects/[id]/page.tsx` – setter prompt, deler state, registrerer handlinger og viser Copilot-orienterte kort (prosjektdata, komponentregister, DAG).
- `frontend/lib/copilot/projectState.ts` – gjenbrukbar hook for å mappe `Project`, `Node`, `Task` og lokale komponenter til Copilot-state.

Neste steg (Sprint 2) er å erstatte mockede komponenter/noder med data fra `A3_PROJECT_API` og la Copilot trigge backend-jobber (`createDefaultNodes`, `runRuleEngine` m.m.) via samme mønster.
