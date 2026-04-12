# Hero Rent/Buy Mode Transition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user clicks Rent/Buy in the hero, the background image, headline, and subtext animate (zoom-fade) to reflect the new mode, and the toggle pill has a sliding animated indicator.

**Architecture:** All changes are self-contained in `PropertyHero`. A `layoutId` motion div creates the sliding pill. Two `AnimatePresence` wrappers handle the image swap and the text swap independently, both using a zoom-fade enter / fade-out exit.

**Tech Stack:** React, Framer Motion (`motion/react` — already installed), TypeScript, Tailwind CSS

---

## File Map

| File | Action |
|------|--------|
| `src/components/ui/property-hero.tsx` | Modify — add sliding toggle indicator, animated image swap, animated text swap |

---

### Task 1: Add sliding pill indicator to the Rent/Buy toggle

**Files:**
- Modify: `src/components/ui/property-hero.tsx`

- [ ] **Step 1: Import `motion` from `motion/react`**

At the top of `property-hero.tsx`, add the import:

```tsx
import { motion, AnimatePresence } from 'motion/react';
```

- [ ] **Step 2: Replace the two static `<button>` elements with motion-aware buttons that share a `layoutId` indicator**

Replace the entire toggle `<div>` (lines 47–78 in the current file) with:

```tsx
{onModeChange && (
  <div
    className="flex items-center mb-8 p-1 rounded-full"
    style={{
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.15)',
    }}
  >
    {(['rent', 'buy'] as const).map((m) => (
      <button
        key={m}
        onClick={() => onModeChange(m)}
        className="relative px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-200 z-10"
        style={{ color: mode === m ? '#fff' : 'rgba(255,255,255,0.65)', background: 'transparent' }}
      >
        {mode === m && (
          <motion.div
            layoutId="hero-mode-indicator"
            className="absolute inset-0 rounded-full"
            style={{ background: 'hsl(214,100%,59%)', boxShadow: '0 2px 12px rgba(37,99,235,0.45)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 capitalize">{m}</span>
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 3: Start the dev server and verify the pill slides smoothly when toggling**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run dev
```

Open http://localhost:8080 and click Rent/Buy several times. The blue pill should slide between the two buttons with a spring animation.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/components/ui/property-hero.tsx
git commit -m "feat: add sliding layoutId indicator to hero rent/buy toggle"
```

---

### Task 2: Animate the background image swap (zoom-fade)

**Files:**
- Modify: `src/components/ui/property-hero.tsx`

- [ ] **Step 1: Define the image map at the top of the component**

Add this constant inside the component function, before the `return`:

```tsx
const heroImages: Record<Mode, string> = {
  rent: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1920&auto=format&fit=crop',
  buy:  'https://images.unsplash.com/photo-1600210492493-0946911123ea?q=80&w=1920&auto=format&fit=crop',
};
```

- [ ] **Step 2: Replace the static background `<div>` with an `AnimatePresence` + keyed `motion.div`**

Find the current background image block (the `<div className="absolute inset-0 bg-cover ...">` at line 18). Replace it with:

```tsx
{/* ── Background image — zoom-fade on mode change ── */}
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={mode}
    className="absolute inset-0 bg-cover bg-[center_35%] sm:bg-center"
    style={{ backgroundImage: `url(${heroImages[mode]})` }}
    initial={{ opacity: 0, scale: 1.08 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.04 }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  >
    {/* Dark overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/72" />
    {/* Blue wash */}
    <div className="absolute inset-0 bg-[hsl(214,100%,30%)] opacity-20" />
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 3: Verify image swap in browser**

Click Rent → Buy. The background image should zoom-fade from the exterior rental photo to the bright modern interior. Clicking back to Rent should return to the original image.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/components/ui/property-hero.tsx
git commit -m "feat: animate hero background image with zoom-fade on rent/buy mode change"
```

---

### Task 3: Animate the headline and subtext

**Files:**
- Modify: `src/components/ui/property-hero.tsx`

- [ ] **Step 1: Define the copy map at the top of the component (alongside the image map)**

Add this constant inside the component function, directly after `heroImages`:

```tsx
const heroCopy: Record<Mode, { headline: React.ReactNode; subtext: string }> = {
  rent: {
    headline: <>Find Your Perfect{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Home</span>{' '}in South Africa</>,
    subtext: 'Verified listings. Direct landlords. Zero agent fees. RentLekker makes renting simple, safe, and transparent.',
  },
  buy: {
    headline: <>Buy Your Dream{' '}<span style={{ color: 'hsl(214,100%,80%)' }}>Property</span>{' '}in South Africa</>,
    subtext: 'Trusted property sales across South Africa. Browse verified listings and connect directly with sellers — no middlemen.',
  },
};
```

- [ ] **Step 2: Replace the static `<h1>` and `<p>` with an `AnimatePresence` + keyed `motion.div`**

Find the `{/* Headline */}` and `{/* Sub-headline */}` blocks. Remove both and replace them with:

```tsx
{/* Headline + Sub-headline — fade-up on mode change */}
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={mode}
    className="flex flex-col items-center"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
  >
    <h1
      className="text-4xl sm:text-6xl lg:text-[82px] font-bold text-center leading-[1.05] tracking-tight max-w-4xl mb-5"
      style={{ color: '#ffffff', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
    >
      {heroCopy[mode].headline}
    </h1>
    <p
      className="text-base sm:text-xl text-center max-w-2xl leading-relaxed mb-10"
      style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
    >
      {heroCopy[mode].subtext}
    </p>
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 3: Verify full transition in browser**

Click Rent → Buy. You should see:
1. Blue pill slides right to "Buy"
2. Background image zoom-fades to modern interior
3. Headline and subtext fade up to the Buy copy
4. Search widget stays in place throughout

Click Buy → Rent to verify the reverse also works cleanly.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/components/ui/property-hero.tsx
git commit -m "feat: animate hero headline and subtext on rent/buy mode change"
```

---

### Task 4: Final polish check

**Files:**
- Modify: `src/components/ui/property-hero.tsx` (only if issues found)

- [ ] **Step 1: Check for layout shift**

Toggle Rent/Buy 5–6 times rapidly. Verify:
- No layout shift or jank on the search widget
- The decorative grid lines and scroll cue stay stable
- On mobile (browser devtools at 390px width) the transition looks clean

- [ ] **Step 2: Check `initial={false}` is on both `AnimatePresence` wrappers**

Open `property-hero.tsx` and confirm both `<AnimatePresence>` blocks have `initial={false}`. This prevents the enter animation from firing on first page load (there's nothing to transition from).

- [ ] **Step 3: Run lint**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run lint
```

Expected: no errors. Fix any TypeScript or lint warnings before committing.

- [ ] **Step 4: Final commit if any fixes were made**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/components/ui/property-hero.tsx
git commit -m "fix: hero mode transition polish"
```
