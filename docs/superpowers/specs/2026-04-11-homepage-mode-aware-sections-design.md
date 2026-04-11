# Homepage Mode-Aware Sections — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

When the user switches between Rent and Buy on the homepage hero toggle, all major page sections below the hero should update their content (copy, bullets, CTAs) to reflect the selected mode. Transitions use Framer Motion fade-up animations consistent with the hero.

---

## Architecture

`Index.tsx` already owns `const [mode, setMode] = useState<'rent' | 'buy'>('rent')`. The `mode` value is passed as a prop to each affected section. Each section defines its own mode-keyed content object at module level and wraps swappable content in `AnimatePresence mode="wait" initial={false}` + `motion.div key={mode}`.

**Animation spec (all sections):**
- Enter: `opacity: 0 → 1`, `y: 16 → 0`, `duration: 0.4s`, `ease: [0.16, 1, 0.3, 1]`
- Exit: `opacity: 0`, `y: -8`, `duration: 0.25s`
- `initial={false}` on all `AnimatePresence` — no animation on first paint

---

## Files

| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Pass `mode` prop to sections; extract For Sellers + For Buyers blocks into separate components; add `AnimatePresence` to marquee belt and CTA section |
| `src/components/sections/ForSellersSection.tsx` | New — mode-aware For Sellers/Landlords section |
| `src/components/sections/ForBuyersSection.tsx` | New — mode-aware For Buyers/Tenants section |

---

## Section 1 — Marquee Feature Belt

Wraps `<Marquee>` in `AnimatePresence mode="wait" initial={false}` keyed by `mode`. Items defined as `marqueeContent: Record<Mode, MarqueeItem[]>` at module level in `Index.tsx`.

**Rent items:** Commission-Free, Digital Leases, Auto Invoicing, Credit Checks, In-App Messaging, Smart Dashboard, Secure Contracts, List in Minutes, Unlimited Properties, Mobile-First, Verified Listings, 50+ SA Cities

**Buy items:** Zero Agent Fees, Verified Listings, Offer Management, Credit Checks, In-App Messaging, Transfer Support, Secure Contracts, List in Minutes, Unlimited Properties, Mobile-First, Buyer Screening, 50+ SA Cities

Icons: same icon set (Lucide) — map each Buy item to the closest matching icon.

---

## Section 2 — For Sellers Section (`ForSellersSection.tsx`)

Replaces the current "For Landlords" inline JSX block in `Index.tsx`.

**Props:** `mode: 'rent' | 'buy'`

**Content map** (`forSellersContent: Record<Mode, ...>`) defined at module level:

### Rent mode
- Label: "For Landlords"
- Headline: "List your property." / "Keep your money."
- Subtext: "RentLekker finds you tenants and handles referencing, contracts, and more — while you stay in full control and pay zero commission."
- Bullets: "100% Commission-Free", "No Hidden Fees", "Full Property Management Tools", "Verified Tenant Screening", "Securely Stored Records"
- Primary CTA: "Add Listing" → `/list-property`
- Secondary CTA: "Learn More" → `/about/landlord`

### Buy mode
- Label: "For Sellers"
- Headline: "Sell your property." / "Zero agent fees."
- Subtext: "List your property for sale on RentLekker and connect directly with verified buyers — no middlemen, no commissions, full control."
- Bullets: "Zero Agent Fees", "Verified Buyer Screening", "Transparent Offer Management", "Secure Transfer Process", "No Hidden Costs"
- Primary CTA: "List for Sale" → `/list-sale`
- Secondary CTA: "Learn More" → `/about/landlord`

**Animation:** `AnimatePresence mode="wait" initial={false}` wraps the entire text + bullets + CTA column, keyed by `mode`. Images (two overlapping photo cards + badge) stay static — they work for both contexts.

**Layout:** Identical to current For Landlords layout (grid md:grid-cols-2, image right, text left).

---

## Section 3 — For Buyers Section (`ForBuyersSection.tsx`)

Replaces the current "For Tenants" inline JSX block in `Index.tsx`.

**Props:** `mode: 'rent' | 'buy'`

**Content map** (`forBuyersContent: Record<Mode, ...>`) defined at module level:

### Rent mode
- Label: "For Tenants"
- Headline: "Find your next home." / "No agent fees."
- Subtext: "On RentLekker there are never any agent fees. We verify all listings so you never encounter dead adverts. Your safety and security are our priority."
- Bullets: "No Agent Fees — Ever", "Verified Properties Only", "Direct Landlord Communication", "Secure Digital Leases"
- Primary CTA: "Find Rental" → `/properties`
- Secondary CTA: "Learn More" → `/about/tenant`

### Buy mode
- Label: "For Buyers"
- Headline: "Find your dream property." / "Own it."
- Subtext: "Browse verified properties for sale across South Africa. Connect directly with sellers, submit digital offers, and get transfer attorney support — all in one place."
- Bullets: "Verified Listings Only", "Direct Seller Communication", "Secure Digital Offers", "Transfer Attorney Support"
- Primary CTA: "Browse for Sale" → `/sale-listings`
- Secondary CTA: "Learn More" → `/about/tenant`

**Animation:** Same as `ForSellersSection` — text column animates, image column stays static.

**Layout:** Identical to current For Tenants layout (image left, text right).

---

## Section 4 — Features Grid

Remains inline in `Index.tsx`. A `featuresContent: Record<Mode, Feature[]>` map replaces the current static `features` array. The grid layout (4-column, 8 cards) does not change.

**Rent features (current):** Commission-Free, Smart Platform, Speed & Simplicity, All-in-One Dashboard, Built-In Invoicing, Verified & Secure, In-App Messaging, Unlimited Properties

**Buy features:**
1. Zero Agent Fees — "Keep 100% of your sale proceeds. No agent commissions, ever."
2. Smart Platform — "Digital offers, e-signatures, and smart dashboards built for modern property sales." *(same icon)*
3. Speed & Simplicity — "List, screen offers, and close in less time. No delays, no middlemen." *(same)*
4. All-in-One Dashboard — "Listings, offers, buyer comms, and transfer tracking from one place." *(same)*
5. Offer Management — "Receive, compare, and accept offers digitally. Full audit trail included."
6. Verified & Secure — "Credit-checked buyers, verified listings, legally binding offer documents." *(same)*
7. In-App Messaging — "Chat, share documents, and track offer updates — no WhatsApp chaos." *(same)*
8. Transfer Support — "Built-in transfer attorney referral network. We guide you through to registration."

`AnimatePresence mode="wait" initial={false}` wraps the entire 8-card grid, keyed by `mode`.

Section heading text also switches:
- Rent: "Built for modern renting"
- Buy: "Built for modern property sales"

---

## Section 5 — Final CTA Section

Remains inline in `Index.tsx`. A `ctaContent: Record<Mode, ...>` object replaces the two static strings.

**Rent:**
- Headline line 1: "Rent smarter."
- Headline line 2: "Rent safer."
- Subtext: "Join South Africa's most trusted commission-free rental platform today."
- Primary button: "Browse Properties" → `/properties`
- Secondary button: "List Your Property" → `/list-property`

**Buy:**
- Headline line 1: "Buy smarter."
- Headline line 2: "Buy safer."
- Subtext: "Find your dream property on South Africa's most trusted commission-free platform."
- Primary button: "Browse for Sale" → `/sale-listings`
- Secondary button: "List for Sale" → `/list-sale`

`AnimatePresence mode="wait" initial={false}` wraps the headline + subtext + button group, keyed by `mode`. Background gradient and dot-grid overlay stay static.

---

## What Does Not Change

- Testimonials section — stays as-is (generic enough for both modes)
- Featured Properties section — placeholder, stays as-is
- Blog section — stays as-is
- Navbar, footer — unchanged
- All image assets — same images work for both modes
- Section background colours and spacing — unchanged

---

## Routes Referenced (must exist)

| Route | Mode |
|-------|------|
| `/properties` | Rent |
| `/list-property` | Rent |
| `/about/landlord` | Both |
| `/about/tenant` | Both |
| `/sale-listings` | Buy |
| `/list-sale` | Buy |

`/sale-listings` and `/list-sale` already exist as pages (`SaleListings.tsx`, `ListSale.tsx`) — no new routes needed.

---

## Dependencies

- `motion/react` — already installed
- No new packages
