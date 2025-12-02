# Rule Library & Governance

## Hierarki
1. **GLOBAL** – EU-direktiv (EUR-Lex), TEK17, Arbeidstilsynet. Fulltekst lovlig → felles for alle.
2. **TENANT** – TermoTeam standardkrav (f.eks. ekstra FDV-krav, kundetypeprofiler).
3. **CUSTOMER** – kundens interne krav. Knyttes til deres prosjekter.
4. **PROJECT** – overrides (valg ved konflikt, spesialtilpasninger).

## Metadata
- Hver regel har `code`, `description`, `severity`, `applies_to`, `condition`, `outcome`, `sources` (URI + referanse).
- Standardreferanser: kun nummer/tittel/kapittel, aldri full tekst.

## Konflikter
- Oppdages automatisk, logges, og må løses av admin.
- Resultatet lagres i `rule_overrides` og flagges VARSEL i dokumenter.

## Testing
- Rule Studio har "simulate" funksjon: velg prosjekt/fakta → vis hvilke regler som trigger.
- Regression tests: sikrer at oppdaterte regler ikke bryter eksisterende prosjekter (lag snapshot).

## Lisens & Lovlighet
- NS/EN/ISO: kun metadata med mindre kunden laster opp egen kopi.
- EUR-Lex/TEK17/arbeidstilsynet: full tekst lovlig → RAG chunking ok.
