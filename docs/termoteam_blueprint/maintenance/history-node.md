# Maintenance History Node

## Purpose
Samler komplett service-/vedlikeholdshistorikk for et prosjekt eller komponent.

## Data Shape (`nodes.data`)
```json
{
  "type": "MAINTENANCE_HISTORY",
  "entries": [
    {
      "maintenance_event_id": "...",
      "performed_at": "2026-05-12T10:30:00Z",
      "performed_by": "Hansen",
      "event_type": "PERIODIC_SERVICE",
      "report_node_id": "...",
      "status": "APPROVED"
    }
  ]
}
```

## Relations
- `COMPONENT_NODE --DEPENDS_ON--> MAINTENANCE_HISTORY`
- `MAINTENANCE_REPORT --UPDATES--> MAINTENANCE_HISTORY`
- `FDV --SUMMARIZES--> MAINTENANCE_HISTORY`

## UI
- Timeline view
- Filter per komponent
- Link til rapport node + original filer

## Archiving
- Behold entries i hot storage så lenge prosjekt er aktivt.
- Når arkivpolicy utløper: flytt til cold, men hold metadata for timeline.
