# Operasjonelle Arbeidsflyter (Workflows)

## 1. Oppstart av nytt Prosjekt (Onboarding)
**Aktør:** Prosjektleder (TermoTeam)

1. **Opprett Prosjekt:**
   - Bruker logger inn og velger "Nytt Prosjekt".
   - Input: Kunde, Adresse, Anleggstype (f.eks. "CO2 Kuldeanlegg"), Arkivpolicy.
2. **Regel-sjekk (Auto):**
   - Systemet sjekker "Anleggstype" mot Regelmotor.
   - Identifiserer krav: "Krever FDV, Risikovurdering NS-EN 378, CE-samsvar".
3. **DAG-generering (Auto):**
   - Node Orchestrator oppretter en "Placeholder DAG" med tomme noder for alle påkrevde dokumenter.
   - Status på noder settes til `DRAFT` eller `MISSING_INPUT`.
4. **Fil-opplasting:**
   - Bruker laster opp P&ID, Komponentlister, Tilbudsdokumenter.
   - Ingestion Service prosesserer og kobler filer til riktige noder.

## 2. Generering av Dokumentasjon
**Aktør:** AI (Node Orchestrator + Document Builder) + Bruker

1. **Trigger:** Bruker klikker "Generer FDV-pakke".
2. **Data-innsamling:**
   - AI henter data fra opplastede filer (Komponenter, Ytelser).
   - AI slår opp i Regelverk (Hva MÅ være med i en FDV?).
3. **Utkast-produksjon:**
   - Document Builder fyller ut malene.
   - Hver seksjon tagges med kilde (Traceability).
4. **Godkjenning:**
   - Bruker får varsel: "FDV klar for gjennomgang".
   - Bruker ser diff/utkast.
   - Bruker godkjenner -> Node status `APPROVED`. Snapshot opprettes.

## 3. Vedlikeholdshendelse (Service)
**Aktør:** Ekstern Montør (via API/App)

1. **Utførelse:** Montør bytter en sikkerhetsventil på anlegget.
2. **Rapportering:**
   - Montør sender rapport via app (Bilde av ny ventil + serienummer).
   - API mottar data -> `maintenance_event` opprettes.
3. **Analyse (Auto):**
   - Maintenance Engine ser at "Sikkerhetsventil" er en kritisk komponent.
   - Trigger Task: "Oppdater CE-dokumentasjon og FDV".
4. **Oppdatering:**
   - AI lager nytt utkast til FDV (med ny ventil-data).
   - AI lager nytt utkast til Samsvarserklæring (hvis nødvendig).
   - Prosjektleder får varsel om å godkjenne endringene.

## 4. Revisjon og Regelendring
**Aktør:** System Admin / Compliance Officer

1. **Ny Regel:** EU kommer med nytt direktiv for CO2-håndtering.
2. **Oppdatering:** Admin oppdaterer Regelbiblioteket.
3. **Konsekvensanalyse:**
   - Systemet skanner alle aktive prosjekter.
   - Finner 50 anlegg som nå mangler et spesifikt punkt i risikovurderingen.
4. **Masse-oppgave:**
   - Systemet oppretter Task på alle 50 prosjekter: "Revider Risikovurdering iht. nytt direktiv".
   - Prosjektledere får varsel og kan kjøre oppdateringen med ett klikk.

## 5. Arkivering og Sluttfase
**Aktør:** System (Auto)

1. **Trigger:** Dato for "Decommissioning" passeres.
2. **Prosess:**
   - Prosjekt settes til `ARCHIVED`.
   - Tunge data (originalfiler, embeddings) flyttes til Cold Storage (S3 Glacier).
   - Metadata og revisjonslogg beholdes i Hot Storage for søk.
   - API-nøkler deaktiveres.
