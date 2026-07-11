# Photos-only Condition Record, no item checklist

The Inspection feature (landlord condition checklist) was replaced by a single tenancy-anchored **Condition Record**: location-tagged photos captured by both parties, locked by mutual attestation, one per tenancy per event (`move_in`, `move_out`). We deliberately rejected an itemised room/item/condition-rating structure for condition evidence — in a deposit dispute the dated photos are the evidence, self-assessed ratings add nothing a photo doesn't show better, and the checklist was the main source of friction (half-completed checklists are worse than none). The old `inspection_*` tables were dropped, not migrated.

**Amended 2026-07-11:** the shared-gallery attestation model was replaced by **per-party photo sets**. Saved photos are permanent evidence — no party can ever delete one (a mistagged photo is simply superseded by a better one; the DB refuses deletes outright). Each party's set locks the moment *that party* attests; one party's uploads no longer clear the other party's attestation. `condition_records` now also records *who* attested (`tenant_attested_by`, `landlord_attested_by`); the attested photo set is identified by `uploaded_by` + the attestation timestamp, since the set cannot change after attesting. Location tags are generated from the property's details (bedrooms, bathrooms, parking, location-type amenities) rather than a fixed list.

**Amended 2026-07-10:** the original decision also retired Inventory. Reversed — the Inventory feature is **kept**, repurposed as the stock list of furniture/contents for a furnished Property (what items exist), not as condition evidence (what state they are in). Condition evidence is exclusively the Condition Record's job; Inventory answers "is everything still here", not "what condition is it in".

## Consequences

- A party's photo set is frozen by their own attestation; both parties attested = permanently locked, no amendments.
- Anything a photo can't show ("geyser is 8 years old") goes in a per-party free-text notes field, not a resurrected checklist.
- The Annexure A **Condition Report** (Property Practitioners Act defect disclosure) is a different artifact and stays in the lease flow.
