# Task Templates

| Code | Trigger | Steps | Outputs |
|------|---------|-------|---------|
| `GENERATE_FDV` | New project / major change | collect facts → rule engine → doc builder → user review | FDV node draft + approval task |
| `GENERATE_CE_PED` | New project / change PS/volum | rule engine scope PED → doc builder → compliance flags | CE/PED node |
| `GENERATE_CO2_RISK` | CO₂ projects | rule engine risk scope → doc builder | Risk node |
| `GENERATE_CUSTOMER_FOLDER` | After FDV/CE/Risk approved | collect nodes → doc builder (bundle) | Customer folder node + export |
| `INTERPRET_MAINTENANCE_REPORT` | Maintenance event | parse payload → maintenance report node | Maintenance report draft |
| `UPDATE_FDV_AFTER_MAINTENANCE` | Maintenance event with component change | create node revision flagged MAINTENANCE_UPDATE | FDV pending review |
| `UPDATE_COMPLIANCE_AFTER_MAINTENANCE` | Optional | rerun rule engine + compliance docs | Updated compliance node |
| `RESOLVE_RULE_CONFLICT` | Rule Engine conflict | gather context → admin decision/override | override + log |

Hver template definerer: steg, actions (agentkall), påkrevd brukerinput, forventet node-status etterpå.
