# Document Template Schema

Templates lages i TermoTeam sin editor, lagres som JSON og versjoneres.

## Structure
```json
{
  "template_id": "FDV_MAIN_V1",
  "version": "1.0.0",
  "title": "FDV – Standard",
  "sections": [
    {
      "id": "overview",
      "title": "Anleggsdata",
      "fields": [
        {"id": "location", "label": "Lokasjon", "type": "text", "required": true},
        {"id": "ps", "label": "PS (bar)", "type": "number", "autoFilled": true}
      ]
    },
    {
      "id": "maintenance",
      "title": "Vedlikehold",
      "fields": [
        {"id": "interval", "label": "Intervall", "type": "text", "source": "manual"}
      ]
    }
  ]
}
```

## Versioning
- Minor bump når seksjoner/tekst endres.
- Node snapshot lagrer hvilken versjon som ble brukt.
- Når template oppdateres, tasks kan foreslå re-generering.

## Field Types
- `text`, `number`, `select`, `richtext`, `checklist`, `attachment`, `table`.
- `autoFilled: true` betyr Document Builder prøver å hente verdi automatisk.
- `userOnly: true` betyr kun manuelt input (AI skal ikke foreslå innhold).
