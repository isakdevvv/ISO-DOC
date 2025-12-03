# Legal Standards & Content Policy

## 1. Purpose
Vi håndterer kilder med svært ulik lisens. Denne policyen beskriver hvordan vi klassifiserer, lagrer og eksponerer innhold slik at produktet holder seg innenfor lisensvilkår og åndsverklov.

Målet er å:
- Beskytte selskapet mot IP-brudd.
- Gi klare rammer til utviklere, domeneeksperter og AI-agenter.
- Sikre at systemet enkelt kan åpnes for fulltekst når vi har formelle avtaler.

## 2. Kildeklasser

| Klasse | Eksempler | Tillatt i RAG | Kommentar |
| ------ | --------- | ------------- | --------- |
| **A – Åpne** | DSB-temaveiledninger, EU-PED-guidelines, Arbeidstilsynet | Fulltekst | Kan ingestes og siteres fritt (så lenge kilde oppgis). |
| **B – Semi-åpne** | VKE-veiledning, Kulde- og varmepumpenormen | Fulltekst, men *kun internt* | RAG/LLM som møter kunde får kun bruke våre egne sammendrag/kravobjekter. |
| **C – Lisensierte/Kjøpte** | NS-EN 378, PED, ISO-standarder | **Ingen** fulltekst før vi har eksplisitt lisens | Bruk kun metadata + egne requirement-objekter med referanse til standard + paragraf. |

## 3. Ingestion-modus
Alle `KnowledgeResource`-poster skal få både `legalClass` og `ingestionMode`.

```ts
type LegalClass = 'A' | 'B' | 'C';
type IngestionMode = 'fulltext' | 'fulltext_internal_only' | 'metadata_only';
```

| legalClass | Allowed ingestionMode | RAG-policy |
| ---------- | -------------------- | ---------- |
| A | `fulltext` | Fritt tilgjengelig for alle agenter. |
| B | `fulltext_internal_only` eller `metadata_only` | `fulltext_internal_only` chunks kan kun returneres til ansatte/fagansatte. Kundevendte agenter får bare requirement/sammendrag. |
| C | `metadata_only` (evt. korte, interne notater) | Kundevendte agenter må aldri få chunk med original tekst. Agenten returnerer kun vår tolkning og refererer til standard og paragraf. |

## 4. Agent- og API-guardrails
1. Query-layer må filtrere på `legalClass`. Default: kundevendte API-er/RAG-serier `WHERE legal_class IN ('A')`.
2. Interne fag-agenter kan eksplisitt be om `('A','B')`.
3. Klasse C eksponeres *kun* via requirement/metadata API:
   - `Requirement.summary`
   - `Requirement.requiredEvidenceTypes`
   - `Requirement.standardRef` (gir f.eks. `NS-EN 378-2:2016 §5.3` som referanse).
4. PDF-generatorer, dokumenteksport og kunderapporter skal aldri embedde originaltekst fra klasse B/C-kilder.

## 5. Håndtering av kjøpte standarder
1. Kjøp/lisensier standarden til internt bruk (digital eller fysisk kopi).
2. Domeneekspert leser og bygger:
   - `Requirement`-objekter (id, standardRef, summary, risk, evidence-typer, tags).
   - Sjekklister (`FormDefinition`) og data dictionary-felter.
3. Originaltekst legges ikke inn i kunnskapsbasen.
4. Når en utvikler trenger mer kontekst, slå opp i originalt PDF/bok-lager (tilgang kontrolleres utenfor plattformen).

## 6. Prosess når vi legger til en ny kilde
1. Registrer kilden i `domain/library_sources.yaml` med `legalClass`, `ingestionMode`, lisensinfo og kontaktlenke.
2. Dokumenter lisensgrunnlag i `docs/sources/README.md` (hva vi har lov til å gjøre).
3. Oppdater ingest-skriptet til å håndtere nye regler (f.eks. hopp over chunking for `metadata_only`).
4. Fyll inn `Requirement`-objekter hvis kilden er en norm/standard.
5. Legg til test som verifiserer at RAG-api filtrerer korrekt.

## 7. Forbudte handlinger uten eksplisitt juridisk godkjenning
- Hel- eller delvis scanning/fotografering/OCR av kjøpte standarder med bruk i produktet.
- “Screenshot OCR” av digitale standarder som har DRM/lesebeskyttelse.
- Trening av modeller på klasse C-tekst uten lisens.
- Distribusjon av PDF/tekst fra klasse B/C til kunder.

## 8. Veikart for å åpne opp senere
1. **TODO:** Innen `2025-09-01` skal vi ha tatt kontakt med Standard Norge/ISO for avtale om API/tekstrettigheter.
2. Når avtalen er på plass:
   - Oppdater `legalClass`/`ingestionMode` til å reflektere de nye rettighetene.
   - Re-ingest standarder via offisielt feed.
   - Oppdater frontend/backendsperrer slik at kundevendte agenter fortsatt kun får sitater vi faktisk har lov til å vise.

## 9. Revisjon og eierskap
- Dokumenteier: CTO (eller delegert Compliance Lead).
- Revisjon hvert kvartal, eller ved ny kontrakt som endrer rettigheter.
- Brudd/avvik logges i `docs/compliance-log.md` (planlagt fil).

Med denne policyen kan alle som jobber på plattformen forstå hvilke kilder som er lov å bruke hvor, og hvordan vi senere utvider uten å måtte endre koden fundamentalt.
