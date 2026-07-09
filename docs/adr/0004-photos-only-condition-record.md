# Photos-only Condition Record, no item checklist

The separate Inventory (tenant item checklist with condition ratings and voice notes) and Inspection (landlord equivalent) features were replaced by a single tenancy-anchored **Condition Record**: location-tagged photos captured by both parties, locked by mutual attestation, one per tenancy per event (`move_in`, `move_out`). We deliberately dropped the itemised room/item/condition-rating structure — in a deposit dispute the dated photos are the evidence, self-assessed ratings add nothing a photo doesn't show better, and the checklist was the main source of friction (half-completed checklists are worse than none). The old `inventory_*`/`inspection_*` tables were dropped, not migrated.

## Consequences

- Any photo change while the record is open clears all existing attestations; both parties attested = permanently locked, no amendments.
- Anything a photo can't show ("geyser is 8 years old") goes in a per-party free-text notes field, not a resurrected checklist.
- The Annexure A **Condition Report** (Property Practitioners Act defect disclosure) is a different artifact and stays in the lease flow.
