# Task Inbox Behavior

1. **Statuses**
   - `OPEN`: nyoppdaget, venter på at noen starter.
   - `IN_PROGRESS`: agent eller bruker jobber med steg.
   - `BLOCKED`: node endret av annen task → vent på bruker.
   - `PENDING_REVIEW`: produksjon ferdig, bruker må godkjenne.
   - `DONE`: fullført, logg beholdes.
   - `CANCELLED`: stoppet (logg hvorfor).

2. **Concurrency**
   - Flere tasks kan kjøre parallelt hvis de påvirker ulike noder.
   - Hvis samme node → Task Orchestrator sammenligner `node.updated_at` → blokkerer senere task.

3. **UI**
   - Liste med filtre + sortering.
   - Detaljside viser steg, logg, Copilot-svar, "approve"/"reject" knapper.

4. **Notifications**
   - E-post/slack når tasks venter på godkjenning > X timer.
   - Copilot foreslår "Fullfør disse 3 pending tasks".

5. **Audit**
   - Alle statusendringer logges i `task_runs`.
   - Exporterbar logg til compliance rapport.
