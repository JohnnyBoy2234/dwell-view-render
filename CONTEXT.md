# MzanziHomes

Rental-property platform connecting landlords and tenants: listing properties, screening and applying, signing leases, and managing the ongoing tenancy (rent, maintenance, condition records). Delivered as two native apps (tenant, landlord) plus web and admin surfaces over one shared codebase.

This glossary pins the domain vocabulary. Several concepts currently map to more than one table in the database — where that's true, the canonical term is defined here and the dead or competing synonyms are listed under `_Avoid_`. Collapsing the schema onto these terms is tracked separately; the words are settled here.

## Language

### People

**Landlord**:
A person who owns or manages one or more Properties and offers them for rent.
_Avoid_: Owner, host, agent

**Tenant**:
A person who rents, or applies to rent, a Property.
_Avoid_: Renter, lessee, occupant

**Admin**:
An internal operator who moderates listings and users. Not a market participant.
_Avoid_: Staff, moderator, superuser

### Property & discovery

**Property**:
A rentable unit a Landlord lists on the platform.
_Avoid_: Listing, unit, home

**Inquiry**:
A prospective Tenant's initial expression of interest in a Property, before any Viewing or Application.
_Avoid_: Lead, enquiry, message

**Viewing**:
A scheduled visit for a prospective Tenant to see a Property in person.
_Avoid_: Showing, appointment, inspection (condition assessment is a Condition Record — see below)

**Application**:
A Tenant's formal request to rent a specific Property, carrying their screening information.
_Avoid_: Request, submission

### Leasing

The lifecycle is **Application → Offer to Lease → Lease Agreement → Tenancy**. The Agreement is the *document*; the Tenancy is the *relationship* it creates. Keep them distinct — "lease" alone is ambiguous and should be avoided.

**Offer to Lease**:
A Landlord's proposal of rental terms to a chosen Applicant, made before the Lease Agreement is drawn up.
_Avoid_: Offer (unqualified), proposal, quote

**Lease Agreement**:
The legal document setting out rental terms, executed by Tenant and Landlord signatures. Canonical record: `lease_contracts`.
_Avoid_: Lease, contract, lease_agreement, the dead `leases` table

**Signature**:
A party's e-signature applied to a Lease Agreement, with its audit trail. Canonical record: `signature_audit`.
_Avoid_: lease_signatures (dead), sign-off

**Tenancy**:
The active rental relationship that exists once a Lease Agreement is executed — the basis for rent, maintenance, and Condition Records. Canonical record: `tenancies`.
_Avoid_: Lease (when you mean the ongoing relationship rather than the document), rental, agreement

**Condition Report**:
The Annexure A legal document — the Landlord's disclosure of known defects, made under the Property Practitioners Act as part of the Lease Agreement. Not the photographic Condition Record.
_Avoid_: Condition Record (that is the photographic artifact — see Operations), disclosure (unqualified)

### Operations

**Maintenance Request**:
A Tenant-reported issue with a Property that the Landlord is expected to action.
_Avoid_: Ticket, maintenance_ticket, work order, issue

**Condition Record**:
The photographic record of a Property's condition at move-in or move-out, captured by both parties of a Tenancy and locked by mutual Attestation. One per Tenancy per event.
_Avoid_: Inspection (retired), Inventory (retired), Condition Report (that is the Annexure A legal disclosure — see Leasing), survey, walkthrough

**Attestation**:
A party's agreement that a Condition Record's photographs fairly represent the Property's condition, timestamped per party. Both parties' Attestations lock the record permanently.
_Avoid_: Approval, sign-off, disclosure

### Compliance

**KYC**:
Identity and background verification a party completes before transacting (Know Your Customer).
_Avoid_: Verification (unqualified), screening, onboarding
