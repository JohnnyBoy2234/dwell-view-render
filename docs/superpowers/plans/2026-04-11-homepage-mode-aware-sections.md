# Homepage Mode-Aware Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every major homepage section (marquee, For Sellers, For Buyers, features grid, final CTA) switch its content when the user toggles between Rent and Buy mode.

**Architecture:** `Index.tsx` passes `mode` as a prop to two new section components (`ForSellersSection`, `ForBuyersSection`). All other sections remain inline in `Index.tsx` and use mode-keyed content maps. Every swappable content block is wrapped in `AnimatePresence mode="wait" initial={false}` + `motion.div key={mode}` for fade-up transitions.

**Tech Stack:** React 18, TypeScript, Framer Motion (`motion/react`), Tailwind CSS, Lucide React icons

---

## File Map

| File | Action |
|------|--------|
| `src/components/sections/ForSellersSection.tsx` | Create — mode-aware For Sellers/Landlords section |
| `src/components/sections/ForBuyersSection.tsx` | Create — mode-aware For Buyers/Tenants section |
| `src/pages/Index.tsx` | Modify — add mode-keyed content maps, pass mode to new components, animate marquee + features + CTA |

---

### Task 1: Create `ForSellersSection` component

**Files:**
- Create: `src/components/sections/ForSellersSection.tsx`

- [ ] **Step 1: Create the file with full implementation**

```tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

type Mode = 'rent' | 'buy';

interface ForSellersSectionProps {
  mode: Mode;
}

const forSellersContent: Record<Mode, {
  label: string;
  headline: [string, string];
  headlineAccent: string;
  subtext: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}> = {
  rent: {
    label: 'For Landlords',
    headline: ['List your property.', 'Keep your money.'],
    headlineAccent: 'Keep your money.',
    subtext:
      'MzanziHomes finds you tenants and handles referencing, contracts, and more — while you stay in full control and pay zero commission.',
    bullets: [
      '100% Commission-Free',
      'No Hidden Fees',
      'Full Property Management Tools',
      'Verified Tenant Screening',
      'Securely Stored Records',
    ],
    primaryLabel: 'Add Listing',
    primaryHref: '/list-property',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/landlord',
  },
  buy: {
    label: 'For Sellers',
    headline: ['Sell your property.', 'Zero agent fees.'],
    headlineAccent: 'Zero agent fees.',
    subtext:
      'List your property for sale on MzanziHomes and connect directly with verified buyers — no middlemen, no commissions, full control.',
    bullets: [
      'Zero Agent Fees',
      'Verified Buyer Screening',
      'Transparent Offer Management',
      'Secure Transfer Process',
      'No Hidden Costs',
    ],
    primaryLabel: 'List for Sale',
    primaryHref: '/list-sale',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/landlord',
  },
};

export function ForSellersSection({ mode }: ForSellersSectionProps) {
  return (
    <section
      className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: 'hsl(214 60% 97%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'hsl(214 100% 45%)' }}
              >
                {forSellersContent[mode].label}
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                {forSellersContent[mode].headline[0]}
                <br />
                <span style={{ color: 'hsl(214 100% 50%)' }}>
                  {forSellersContent[mode].headline[1]}
                </span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
                {forSellersContent[mode].subtext}
              </p>
              <ul className="mt-7 space-y-3">
                {forSellersContent[mode].bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-success-green flex-shrink-0" />
                    <span className="text-gray-700 text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-7 py-3 text-sm font-semibold shadow-md"
                >
                  <Link to={forSellersContent[mode].primaryHref}>
                    {forSellersContent[mode].primaryLabel}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-white rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to={forSellersContent[mode].secondaryHref}>
                    {forSellersContent[mode].secondaryLabel}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Static image column */}
          <div className="relative h-[420px]">
            <div
              className="absolute top-0 right-0 w-[62%] h-[70%] rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 16px 48px rgba(37,99,235,0.16)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop"
                alt="Modern property"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute bottom-0 left-0 w-[55%] h-[58%] rounded-2xl overflow-hidden border-4 border-white"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.10)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop"
                alt="Property owner"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute top-6 left-0 bg-white rounded-2xl border px-4 py-3 flex items-center gap-3"
              style={{
                boxShadow: '0 4px 20px rgba(37,99,235,0.10)',
                borderColor: 'hsl(214 60% 90%)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'hsl(142 72% 44% / 0.12)' }}
              >
                <span className="text-success-green font-bold text-sm">R</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Zero Commission</p>
                <p className="text-sm font-bold text-gray-900">100% Yours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | grep "ForSellersSection" | head -10
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/components/sections/ForSellersSection.tsx
git commit -m "feat: add mode-aware ForSellersSection component"
```

---

### Task 2: Create `ForBuyersSection` component

**Files:**
- Create: `src/components/sections/ForBuyersSection.tsx`

- [ ] **Step 1: Create the file with full implementation**

```tsx
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle, Shield } from 'lucide-react';

type Mode = 'rent' | 'buy';

interface ForBuyersSectionProps {
  mode: Mode;
}

const forBuyersContent: Record<Mode, {
  label: string;
  headline: [string, string];
  subtext: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  badgeLabel: string;
  badgeValue: string;
}> = {
  rent: {
    label: 'For Tenants',
    headline: ['Find your next home.', 'No agent fees.'],
    subtext:
      'On MzanziHomes there are never any agent fees. We verify all listings so you never encounter dead adverts. Your safety and security are our priority.',
    bullets: [
      'No Agent Fees — Ever',
      'Verified Properties Only',
      'Direct Landlord Communication',
      'Secure Digital Leases',
    ],
    primaryLabel: 'Find Rental',
    primaryHref: '/properties',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/tenant',
    badgeLabel: 'All Properties',
    badgeValue: 'Verified & Safe',
  },
  buy: {
    label: 'For Buyers',
    headline: ['Find your dream property.', 'Own it.'],
    subtext:
      'Browse verified properties for sale across South Africa. Connect directly with sellers, submit digital offers, and get transfer attorney support — all in one place.',
    bullets: [
      'Verified Listings Only',
      'Direct Seller Communication',
      'Secure Digital Offers',
      'Transfer Attorney Support',
    ],
    primaryLabel: 'Browse for Sale',
    primaryHref: '/sale-listings',
    secondaryLabel: 'Learn More',
    secondaryHref: '/about/tenant',
    badgeLabel: 'All Listings',
    badgeValue: 'Verified & Safe',
  },
};

export function ForBuyersSection({ mode }: ForBuyersSectionProps) {
  return (
    <section
      className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: 'hsl(214 80% 94%)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Static image column */}
          <div className="relative h-[420px] order-2 md:order-1">
            <div
              className="absolute top-0 left-0 w-[62%] h-[70%] rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 16px 48px rgba(37,99,235,0.14)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=800&auto=format&fit=crop"
                alt="Happy family at home"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute bottom-0 right-0 w-[52%] h-[55%] rounded-2xl overflow-hidden border-4 border-white"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.10)' }}
            >
              <img
                src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=600&auto=format&fit=crop"
                alt="Beautiful home"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute top-6 right-0 bg-white rounded-2xl border px-4 py-3 flex items-center gap-3"
              style={{
                boxShadow: '0 4px 20px rgba(37,99,235,0.10)',
                borderColor: 'hsl(214 60% 90%)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'hsl(214 100% 59% / 0.10)' }}
              >
                <Shield className="w-4 h-4" style={{ color: 'hsl(214 100% 50%)' }} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">
                  {forBuyersContent[mode].badgeLabel}
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {forBuyersContent[mode].badgeValue}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              className="order-1 md:order-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'hsl(214 100% 45%)' }}
              >
                {forBuyersContent[mode].label}
              </span>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                {forBuyersContent[mode].headline[0]}
                <br />
                <span className="text-success-green">
                  {forBuyersContent[mode].headline[1]}
                </span>
              </h2>
              <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-md">
                {forBuyersContent[mode].subtext}
              </p>
              <ul className="mt-7 space-y-3">
                {forBuyersContent[mode].bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-success-green flex-shrink-0" />
                    <span className="text-gray-700 text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-full px-7 py-3 text-sm font-semibold shadow-md"
                >
                  <Link to={forBuyersContent[mode].primaryHref}>
                    {forBuyersContent[mode].primaryLabel}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-white rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Link to={forBuyersContent[mode].secondaryHref}>
                    {forBuyersContent[mode].secondaryLabel}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | grep "ForBuyersSection" | head -10
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/components/sections/ForBuyersSection.tsx
git commit -m "feat: add mode-aware ForBuyersSection component"
```

---

### Task 3: Wire new section components into `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add imports for the two new components**

At the top of `src/pages/Index.tsx`, add after the existing component imports:

```tsx
import { ForSellersSection } from "@/components/sections/ForSellersSection";
import { ForBuyersSection } from "@/components/sections/ForBuyersSection";
```

- [ ] **Step 2: Replace the For Landlords inline JSX with `<ForSellersSection>`**

Find the entire `{/* ── FOR LANDLORDS ── */}` section (lines 179–271 in the current file — the full `<section>` tag from `{/* ── FOR LANDLORDS ── */}` to its closing `</section>`). Replace it with:

```tsx
{/* ── FOR SELLERS / LANDLORDS ── */}
<ForSellersSection mode={mode} />
```

- [ ] **Step 3: Replace the For Tenants inline JSX with `<ForBuyersSection>`**

Find the entire `{/* ── FOR TENANTS ── */}` section (the full `<section>` block). Replace it with:

```tsx
{/* ── FOR BUYERS / TENANTS ── */}
<ForBuyersSection mode={mode} />
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | grep "Index" | head -10
```

Expected: no output (no errors on Index.tsx).

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/pages/Index.tsx
git commit -m "feat: replace inline landlord/tenant sections with mode-aware components"
```

---

### Task 4: Mode-aware marquee belt in `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add `HandshakeIcon` alias and update imports at the top of `Index.tsx`**

The Buy marquee needs a "Transfer Support" icon. `Handshake` from Lucide works. Add it to the existing Lucide import line:

```tsx
import {
  Shield,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Smartphone,
  Zap,
  LayoutDashboard,
  Calculator,
  Layers,
  MapPin,
  Home,
  FileText,
  Star,
  Lock,
  Banknote,
  Handshake,
  ClipboardList,
} from "lucide-react";
```

Also add the `AnimatePresence` and `motion` import from `motion/react` if not already present:

```tsx
import { motion, AnimatePresence } from "motion/react";
```

- [ ] **Step 2: Replace the static `marqueeFeatures` array with a mode-keyed map**

Remove the current `marqueeFeatures` constant and replace with:

```tsx
const marqueeContent: Record<'rent' | 'buy', { icon: React.ElementType; label: string }[]> = {
  rent: [
    { icon: Banknote, label: "Commission-Free" },
    { icon: Shield, label: "Verified Listings" },
    { icon: FileText, label: "Digital Leases" },
    { icon: Star, label: "Credit Checks" },
    { icon: MessageSquare, label: "In-App Messaging" },
    { icon: Calculator, label: "Auto Invoicing" },
    { icon: Lock, label: "Secure Contracts" },
    { icon: LayoutDashboard, label: "Smart Dashboard" },
    { icon: Smartphone, label: "Mobile-First" },
    { icon: Zap, label: "List in Minutes" },
    { icon: Layers, label: "Unlimited Properties" },
    { icon: MapPin, label: "50+ SA Cities" },
  ],
  buy: [
    { icon: Banknote, label: "Zero Agent Fees" },
    { icon: Shield, label: "Verified Listings" },
    { icon: ClipboardList, label: "Offer Management" },
    { icon: Star, label: "Credit Checks" },
    { icon: MessageSquare, label: "In-App Messaging" },
    { icon: Handshake, label: "Transfer Support" },
    { icon: Lock, label: "Secure Contracts" },
    { icon: LayoutDashboard, label: "Smart Dashboard" },
    { icon: Smartphone, label: "Mobile-First" },
    { icon: Zap, label: "List in Minutes" },
    { icon: Layers, label: "Unlimited Properties" },
    { icon: MapPin, label: "50+ SA Cities" },
  ],
};
```

- [ ] **Step 3: Update the marquee section JSX to use the map and `AnimatePresence`**

Find the `{/* ── MARQUEE FEATURES BELT ── */}` section. Replace its inner content (keep the outer `<section>` tag and its styles) so it reads:

```tsx
{/* ── MARQUEE FEATURES BELT ── */}
<section
  className="py-5 border-y"
  style={{
    background: "hsl(214 70% 96%)",
    borderColor: "hsl(214 60% 88%)",
  }}
>
  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Marquee duration={30} pauseOnHover fadeAmount={8}>
        {marqueeContent[mode].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="mx-5 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: "hsl(214 100% 59% / 0.08)",
              color: "hsl(214 100% 40%)",
              border: "1px solid hsl(214 100% 59% / 0.15)",
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </div>
        ))}
      </Marquee>
    </motion.div>
  </AnimatePresence>
</section>
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | grep "Index" | head -10
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/pages/Index.tsx
git commit -m "feat: make marquee belt mode-aware with animated swap"
```

---

### Task 5: Mode-aware features grid in `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Replace the static `features` array with a mode-keyed map**

Remove the current `features` constant and replace with:

```tsx
const featuresContent: Record<'rent' | 'buy', {
  icon: React.ElementType | (() => React.ReactElement);
  title: string;
  description: string;
  accent: string;
}[]> = {
  rent: [
    {
      icon: () => <span className="text-xl font-bold text-ocean-blue leading-none">R</span>,
      title: "Commission-Free",
      description: "Keep 100% of your rental income. No agent fees, ever.",
      accent: "hsl(214 100% 59%)",
    },
    {
      icon: Smartphone,
      title: "Smart Platform",
      description: "Digital leases, e-signatures, and smart dashboards built for modern landlords.",
      accent: "hsl(142 72% 44%)",
    },
    {
      icon: Zap,
      title: "Speed & Simplicity",
      description: "List, screen, and sign in minutes. No delays, no middlemen.",
      accent: "hsl(25 95% 53%)",
    },
    {
      icon: LayoutDashboard,
      title: "All-in-One Dashboard",
      description: "Listings, leases, rent, maintenance and accounting from one place.",
      accent: "hsl(275 84% 67%)",
    },
    {
      icon: Calculator,
      title: "Built-In Invoicing",
      description: "Professional invoices generated automatically. Save time, stay compliant.",
      accent: "hsl(174 72% 56%)",
    },
    {
      icon: Shield,
      title: "Verified & Secure",
      description: "Credit-checked tenants, verified listings, legally binding contracts.",
      accent: "hsl(0 78% 62%)",
    },
    {
      icon: MessageSquare,
      title: "In-App Messaging",
      description: "Chat, share documents, and track updates — no WhatsApp chaos.",
      accent: "hsl(235 85% 70%)",
    },
    {
      icon: Layers,
      title: "Unlimited Properties",
      description: "Manage one property or a hundred. Scalable from day one.",
      accent: "hsl(25 95% 53%)",
    },
  ],
  buy: [
    {
      icon: () => <span className="text-xl font-bold text-ocean-blue leading-none">R</span>,
      title: "Zero Agent Fees",
      description: "Keep 100% of your sale proceeds. No agent commissions, ever.",
      accent: "hsl(214 100% 59%)",
    },
    {
      icon: Smartphone,
      title: "Smart Platform",
      description: "Digital offers, e-signatures, and smart dashboards built for modern property sales.",
      accent: "hsl(142 72% 44%)",
    },
    {
      icon: Zap,
      title: "Speed & Simplicity",
      description: "List, screen offers, and close in less time. No delays, no middlemen.",
      accent: "hsl(25 95% 53%)",
    },
    {
      icon: LayoutDashboard,
      title: "All-in-One Dashboard",
      description: "Listings, offers, buyer comms, and transfer tracking from one place.",
      accent: "hsl(275 84% 67%)",
    },
    {
      icon: ClipboardList,
      title: "Offer Management",
      description: "Receive, compare, and accept offers digitally. Full audit trail included.",
      accent: "hsl(174 72% 56%)",
    },
    {
      icon: Shield,
      title: "Verified & Secure",
      description: "Credit-checked buyers, verified listings, legally binding offer documents.",
      accent: "hsl(0 78% 62%)",
    },
    {
      icon: MessageSquare,
      title: "In-App Messaging",
      description: "Chat, share documents, and track offer updates — no WhatsApp chaos.",
      accent: "hsl(235 85% 70%)",
    },
    {
      icon: Handshake,
      title: "Transfer Support",
      description: "Built-in transfer attorney referral network. We guide you through to registration.",
      accent: "hsl(25 95% 53%)",
    },
  ],
};
```

- [ ] **Step 2: Update the features grid section JSX**

Find the `{/* ── FEATURES GRID ── */}` section. Update the heading text and the grid to use `featuresContent[mode]` wrapped in `AnimatePresence`:

```tsx
{/* ── FEATURES GRID ── */}
<section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8" style={{ background: "hsl(214 60% 97%)" }}>
  <div className="max-w-7xl mx-auto">
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-14">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "hsl(214 100% 45%)" }}
          >
            Everything you need
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            {mode === 'rent' ? 'Built for modern renting' : 'Built for modern property sales'}
          </h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            One platform. Every tool you need to list, {mode === 'rent' ? 'rent' : 'sell'}, manage, and communicate — commission-free.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuresContent[mode].map(({ icon: Icon, title, description, accent }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.7)",
                borderColor: "hsl(214 60% 90%)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "white";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(37,99,235,0.09)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.7)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}14` }}
              >
                {typeof Icon === "function" && Icon.length === 0 ? (
                  <Icon />
                ) : (
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
</section>
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | grep "Index" | head -10
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/pages/Index.tsx
git commit -m "feat: make features grid mode-aware with animated swap"
```

---

### Task 6: Mode-aware Final CTA in `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add `ctaContent` map near the top of `Index.tsx` (after other content maps)**

```tsx
const ctaContent: Record<'rent' | 'buy', {
  line1: string;
  line2: string;
  subtext: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}> = {
  rent: {
    line1: 'Rent smarter.',
    line2: 'Rent safer.',
    subtext: "Join South Africa's most trusted commission-free rental platform today.",
    primaryLabel: 'Browse Properties',
    primaryHref: '/properties',
    secondaryLabel: 'List Your Property',
    secondaryHref: '/list-property',
  },
  buy: {
    line1: 'Buy smarter.',
    line2: 'Buy safer.',
    subtext: "Find your dream property on South Africa's most trusted commission-free platform.",
    primaryLabel: 'Browse for Sale',
    primaryHref: '/sale-listings',
    secondaryLabel: 'List for Sale',
    secondaryHref: '/list-sale',
  },
};
```

- [ ] **Step 2: Update the Final CTA section JSX**

Find the `{/* ── FINAL CTA ── */}` section. Keep the outer `<section>` tag, background gradient, dot-grid overlay, and glow blobs unchanged. Update only the inner content div:

```tsx
<div className="max-w-3xl mx-auto text-center relative z-10">
  <span className="inline-block text-xs font-bold uppercase tracking-widest text-white/60 mb-4">
    Join MzanziHomes
  </span>
  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
        {ctaContent[mode].line1}
        <br />
        {ctaContent[mode].line2}
      </h2>
      <p className="mt-5 text-lg text-white/75 max-w-xl mx-auto">
        {ctaContent[mode].subtext}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          asChild
          className="bg-white text-ocean-blue hover:bg-white/90 rounded-full px-8 py-3.5 text-sm font-bold shadow-lg"
        >
          <Link to={ctaContent[mode].primaryHref}>{ctaContent[mode].primaryLabel}</Link>
        </Button>
        <Button
          asChild
          className="bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-full px-8 py-3.5 text-sm font-semibold backdrop-blur-sm"
        >
          <Link to={ctaContent[mode].secondaryHref}>{ctaContent[mode].secondaryLabel}</Link>
        </Button>
      </div>
    </motion.div>
  </AnimatePresence>
</div>
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx tsc --noEmit 2>&1 | grep "Index" | head -10
```

Expected: no output.

- [ ] **Step 4: Run lint on modified files**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npx eslint src/pages/Index.tsx src/components/sections/ForSellersSection.tsx src/components/sections/ForBuyersSection.tsx 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render"
git add src/pages/Index.tsx
git commit -m "feat: make final CTA section mode-aware with animated swap"
```
