# Hero Rent/Buy Mode Transition — Design Spec

**Date:** 2026-04-11  
**Status:** Approved  
**Scope:** `src/components/ui/property-hero.tsx` only

---

## Overview

When a user switches between Rent and Buy on the homepage hero, the background image, headline, and subtext should all animate to reflect the new mode. The toggle pill should have a sliding animated indicator. No other files change.

---

## Toggle Pill

The existing Rent/Buy pill in `PropertyHero` gets a sliding active indicator using Framer Motion's `layoutId`. A `motion.div` with a fixed `layoutId="hero-mode-indicator"` renders inside whichever button is active. Framer Motion automatically animates it sliding left↔right when mode changes.

- Active button: blue pill background, white text
- Inactive button: transparent, 65% white text
- The `motion.div` indicator uses `layout` transition with `type: "spring", stiffness: 400, damping: 30`

---

## Background Image Swap — Zoom Fade

Two images, one per mode:

| Mode | Image URL |
|------|-----------|
| Rent | `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1920&auto=format&fit=crop` |
| Buy  | `https://images.unsplash.com/photo-1600210492493-0946911123ea?q=80&w=1920&auto=format&fit=crop` |

Implementation: `AnimatePresence mode="wait"` wraps a `motion.div` keyed by `mode`. 

- **Enter:** `opacity: 0 → 1`, `scale: 1.08 → 1.0`, duration `0.6s`, ease `[0.16, 1, 0.3, 1]`
- **Exit:** `opacity: 1 → 0`, `scale: 1.0 → 1.04`, duration `0.3s`

The image div is `position: absolute; inset: 0` with `bg-cover bg-center` — same as current. The overlays (gradient + blue wash) stay outside `AnimatePresence` so they don't flicker during the transition.

---

## Headline & Subtext Animation

`AnimatePresence mode="wait"` wraps a `motion.div` keyed by `mode` containing the `<h1>` and `<p>`.

- **Enter:** `opacity: 0 → 1`, `y: 16 → 0`, duration `0.5s`, delay `0.08s`, ease `[0.16, 1, 0.3, 1]`
- **Exit:** `opacity: 1 → 0`, `y: 0 → -8`, duration `0.25s`

Text content per mode:

**Rent:**
- Headline: "Find Your Perfect **Home** in South Africa"
- Subtext: "Verified listings. Direct landlords. Zero agent fees. RentLekker makes renting simple, safe, and transparent."

**Buy:**
- Headline: "Buy Your Dream **Property** in South Africa"
- Subtext: "Trusted property sales across South Africa. Browse verified listings and connect directly with sellers — no middlemen."

The `<span>` highlight colour (`hsl(214,100%,80%)`) stays the same for both modes.

---

## Search Widget

The `{children}` slot (renders `PropertySearchWidget`) is not animated. It stays mounted and visible throughout mode transitions. This is intentional — the search widget has its own internal state and should not unmount.

---

## What Does Not Change

- `Index.tsx` — `mode` state and `onModeChange` are already wired correctly, no changes needed
- Decorative grid lines, scroll cue, overlays — unchanged
- All other sections on the page (marquee, for landlords, for tenants, etc.) — unchanged
- No new files created

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/property-hero.tsx` | Add `AnimatePresence` for image + text, add `layoutId` to toggle indicator |

---

## Dependencies

- `motion/react` (Framer Motion) — already installed and used in `Index.tsx`
- No new packages required
