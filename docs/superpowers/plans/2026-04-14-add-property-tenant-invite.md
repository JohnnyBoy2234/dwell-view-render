# Add Property (Unlisted) + Tenant Invite Link + Mobile Listing Choice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let landlords add a private property (no public listing), generate a shareable tenant registration link, and choose from three listing types on mobile.

**Architecture:** Three surfaces — a `/listing-type` choice page, an `/add-property` wizard (fork of ListProperty with `is_listed: false`), and a `/join/:token` tenant onboarding page. Tenant invites live in a new `property_invites` DB table. All public property queries get an `is_listed = true` filter.

**Tech Stack:** React 18 + TypeScript, Supabase (DB + storage), React Hook Form, shadcn/ui Dialog + Input + Button, react-router-dom v6, Tailwind CSS, Lucide React.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/pages/ListingTypePage.tsx` | 3-card choice screen `/listing-type` |
| Create | `src/pages/AddPropertyUnlisted.tsx` | Unlisted property wizard (no pricing, `is_listed: false`) |
| Create | `src/pages/JoinPage.tsx` | Tenant join via invite link `/join/:token` |
| Create | `src/components/property/TenantInviteSection.tsx` | Invite link generator inside Tenants tab |
| Modify | `src/components/MobileBottomBar.tsx` | "+" → `/listing-type` |
| Modify | `src/pages/EnhancedLandlordDashboard.tsx` | Unlisted badge + Publish Listing button |
| Modify | `src/pages/Properties.tsx` | Add `.eq('is_listed', true)` filter |
| Modify | `src/pages/SaleListings.tsx` | Add `.eq('is_listed', true)` filter |
| Modify | `src/pages/PropertyManagement.tsx` | Add TenantInviteSection to Tenants tab |
| Modify | `src/App.tsx` | Register new routes |
| Modify | `src/integrations/supabase/types.ts` | Add new columns + table types |

---

## Task 1: Database Migration

Add `is_listed` + `listing_type` to `properties`, add `id_number` to `profiles`, create `property_invites` table. Run this via the Supabase dashboard SQL editor (Project → SQL Editor → New query).

**Files:**
- SQL only — no source files yet

- [ ] **Step 1: Run migration SQL in Supabase dashboard**

Open your Supabase project → SQL Editor → New query → paste and run:

```sql
-- 1. Add is_listed to properties (default true so all existing properties stay visible)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- 2. Add listing_type to properties (already used in app code but missing from DB)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_type text;

-- 3. Add id_number to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS id_number text;

-- 4. Create property_invites table
CREATE TABLE IF NOT EXISTS property_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  monthly_rent numeric NOT NULL,
  lease_start date NOT NULL,
  lease_end date,
  used_at timestamptz,
  tenant_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. RLS for property_invites
ALTER TABLE property_invites ENABLE ROW LEVEL SECURITY;

-- Landlord can manage their own invites
CREATE POLICY "landlord_manage_invites" ON property_invites
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Anyone can read a single invite by token (for unauthenticated join page)
CREATE POLICY "public_read_invite_by_token" ON property_invites
  FOR SELECT TO anon, authenticated
  USING (true);

-- Tenant can update used_at + tenant_id when accepting
CREATE POLICY "tenant_accept_invite" ON property_invites
  FOR UPDATE TO authenticated
  USING (used_at IS NULL)
  WITH CHECK (tenant_id = auth.uid());
```

- [ ] **Step 2: Verify migration ran cleanly**

In Supabase → Table Editor, confirm:
- `properties` has new columns `is_listed` (bool, default true) and `listing_type` (text, nullable)
- `profiles` has `id_number` (text, nullable)
- Table `property_invites` exists with all columns

- [ ] **Step 3: Update `src/integrations/supabase/types.ts` — properties Row**

Find the `properties` → `Row` block (around line 1627). Add the two new columns:

```ts
// BEFORE (line ~1644 area):
        size_sqm: number | null
        status: string
        title: string

// AFTER:
        size_sqm: number | null
        status: string
        title: string
        is_listed: boolean
        listing_type: string | null
```

Also add to `Insert` block:
```ts
        is_listed?: boolean
        listing_type?: string | null
```

And to `Update` block:
```ts
        is_listed?: boolean
        listing_type?: string | null
```

- [ ] **Step 4: Update `src/integrations/supabase/types.ts` — profiles**

Find `profiles` → `Row` (around line 1525). Add `id_number`:

```ts
// Add after `id_verification_status`:
          id_number: string | null
```

Also in `Insert`:
```ts
          id_number?: string | null
```

And `Update`:
```ts
          id_number?: string | null
```

- [ ] **Step 5: Add `property_invites` type block to `src/integrations/supabase/types.ts`**

Find `property_reports:` (around line 1695) and insert before it:

```ts
      property_invites: {
        Row: {
          id: string
          property_id: string
          landlord_id: string
          token: string
          monthly_rent: number
          lease_start: string
          lease_end: string | null
          used_at: string | null
          tenant_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          landlord_id: string
          token?: string
          monthly_rent: number
          lease_start: string
          lease_end?: string | null
          used_at?: string | null
          tenant_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          landlord_id?: string
          token?: string
          monthly_rent?: number
          lease_start?: string
          lease_end?: string | null
          used_at?: string | null
          tenant_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
```

- [ ] **Step 6: Build to confirm no type errors**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors, none new).

- [ ] **Step 7: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "feat: add is_listed, listing_type, property_invites, id_number to supabase types"
```

---

## Task 2: `/listing-type` Choice Page

**Files:**
- Create: `src/pages/ListingTypePage.tsx`

- [ ] **Step 1: Create `src/pages/ListingTypePage.tsx`**

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniNavbar } from '@/components/ui/mini-navbar';

export default function ListingTypePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const go = (base: string) =>
    navigate(propertyId ? `${base}?propertyId=${propertyId}` : base);

  return (
    <>
      <MiniNavbar />
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light pt-28 sm:pt-24 pb-24 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">What do you want to do?</h1>
          <p className="text-sm text-gray-500 mb-6">Choose how you want to add your property</p>

          {/* List for Rent */}
          <button
            onClick={() => go('/list-property')}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 mb-3 border-2 border-blue-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              🏠
            </div>
            <div className="flex-1">
              <div className="font-bold text-blue-800 text-base">List for Rent</div>
              <div className="text-sm text-gray-500 mt-0.5">Publish your property to find tenants</div>
            </div>
            <span className="text-blue-300 text-xl">›</span>
          </button>

          {/* List for Sale */}
          <button
            onClick={() => go('/list-sale')}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 mb-3 border-2 border-green-200 shadow-sm hover:border-green-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              🏷️
            </div>
            <div className="flex-1">
              <div className="font-bold text-green-800 text-base">List for Sale</div>
              <div className="text-sm text-gray-500 mt-0.5">Publish your property to find buyers</div>
            </div>
            <span className="text-green-300 text-xl">›</span>
          </button>

          {/* Add Property Unlisted */}
          <button
            onClick={() => go('/add-property-unlisted')}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 mb-4 border-2 border-purple-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              🔧
            </div>
            <div className="flex-1">
              <div className="font-bold text-purple-800 text-base">Add Property (Unlisted)</div>
              <div className="text-sm text-gray-500 mt-0.5">Manage tools without a public listing</div>
            </div>
            <span className="text-purple-300 text-xl">›</span>
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800">
              💡 <strong>Add Property (Unlisted)</strong> lets you use all management tools — maintenance,
              leases, payments — without appearing in public search.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ListingTypePage.tsx
git commit -m "feat: add /listing-type choice page (Rent / Sale / Unlisted)"
```

---

## Task 3: Update MobileBottomBar — "+" navigates to `/listing-type`

**Files:**
- Modify: `src/components/MobileBottomBar.tsx` line 57

- [ ] **Step 1: Change the landlord "+" nav item path**

In `src/components/MobileBottomBar.tsx`, find:

```ts
  ...(isLandlord ? [{ path: '/list-property', icon: Plus, label: 'List' }] : []),
```

Replace with:

```ts
  ...(isLandlord ? [{ path: '/listing-type', icon: Plus, label: 'List' }] : []),
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileBottomBar.tsx
git commit -m "feat: mobile + button routes to /listing-type instead of /list-property"
```

---

## Task 4: Add Property (Unlisted) Wizard

A fork of `ListProperty.tsx` that skips the Pricing step and saves the property with `is_listed: false`, `listing_type: null`, and `price: 0`.

**Files:**
- Create: `src/pages/AddPropertyUnlisted.tsx`

- [ ] **Step 1: Create `src/pages/AddPropertyUnlisted.tsx`**

```tsx
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Home, MapPin, Camera, Settings, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuccessDialog } from '@/components/ui/SuccessDialog';
import { MiniNavbar } from '@/components/ui/mini-navbar';

import PropertyTypeStep from '@/components/listing/PropertyTypeStep';
import LocationStep from '@/components/listing/LocationStep';
import DetailsStep from '@/components/listing/DetailsStep';
import PhotosStep from '@/components/listing/PhotosStep';
import ReviewStep from '@/components/listing/ReviewStep';
import type { ListingFormData } from '@/pages/ListProperty';

const steps = [
  { id: 1, title: 'Property Type', icon: Home, description: 'What are you adding?' },
  { id: 2, title: 'Location', icon: MapPin, description: 'Where is your property?' },
  { id: 3, title: 'Details', icon: Settings, description: 'Property specifications' },
  { id: 4, title: 'Photos', icon: Camera, description: 'Add photos (optional)' },
  { id: 5, title: 'Review', icon: CheckCircle, description: 'Confirm and save' },
];

export default function AddPropertyUnlisted() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } =
    useForm<ListingFormData>({
      defaultValues: {
        property_type: '',
        location: '',
        description: '',
        bedrooms: undefined,
        bathrooms: undefined,
        parking_spaces: undefined,
        furnished: false,
        pets_allowed: false,
        amenities: [],
        price: 0,
        images: [],
      },
      mode: 'onChange',
    });

  const formData = watch();
  const progress = (currentStep / steps.length) * 100;

  if (!user) {
    navigate('/auth');
    return null;
  }

  const nextStep = async () => {
    let fields: (keyof ListingFormData)[] = [];
    if (currentStep === 1) fields = ['property_type'];
    if (currentStep === 2) fields = ['location', 'description'];
    if (currentStep === 3) fields = ['bedrooms', 'bathrooms'];
    const valid = await trigger(fields);
    if (valid && currentStep < steps.length) {
      setCurrentStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const uploadImages = async (images: File[]) => {
    const urls: string[] = [];
    for (const img of images) {
      const ext = img.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('property-images').upload(path, img);
      if (error) throw error;
      const { data } = supabase.storage.from('property-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true);
    try {
      const imageUrls = data.images?.length ? await uploadImages(data.images) : [];
      const { error } = await supabase.from('properties').insert({
        title: `${data.property_type} in ${data.location}`,
        description: data.description,
        location: data.location,
        property_type: data.property_type,
        price: 0,
        bedrooms: Number(data.bedrooms) || 1,
        bathrooms: Number(data.bathrooms) || 1,
        parking_spaces: Number(data.parking_spaces) || 0,
        size_sqm: data.size_sqm ? Number(data.size_sqm) : null,
        furnished: data.furnished,
        pets_allowed: data.pets_allowed,
        amenities: data.amenities,
        landlord_id: user.id,
        images: imageUrls,
        is_listed: false,
        listing_type: null,
        status: 'available',
      });
      if (error) throw error;
      setShowSuccessDialog(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <PropertyTypeStep control={control} errors={errors} />;
      case 2: return <LocationStep control={control} errors={errors} />;
      case 3: return <DetailsStep control={control} errors={errors} />;
      case 4: return <PhotosStep control={control} watch={watch} setValue={setValue} />;
      case 5: return <ReviewStep formData={formData} />;
      default: return null;
    }
  };

  return (
    <>
      <MiniNavbar />
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light pt-28 sm:pt-24 pb-24">
        <div className="container max-w-2xl mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Add Your Property</CardTitle>
              <CardDescription>This property won't appear in public search. You can publish it later.</CardDescription>
              <Progress value={progress} className="mt-3" />
            </CardHeader>
            <CardContent>
              {/* Step indicators */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {steps.map(s => {
                  const Icon = s.icon;
                  const done = currentStep > s.id;
                  const active = currentStep === s.id;
                  return (
                    <div key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                      active ? 'bg-blue-600 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                      {s.title}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                {renderStep()}
                <div className="flex justify-between mt-8 gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  {currentStep < steps.length ? (
                    <Button type="button" onClick={nextStep}>
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                      {isSubmitting ? 'Saving…' : 'Save Property'}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => navigate('/enhancedlandlorddashboard')}
        title="Property Added!"
        description="Your property has been saved privately. Manage it from your dashboard, or publish it when ready."
        actionLabel="Go to Dashboard"
        onAction={() => navigate('/enhancedlandlorddashboard')}
      />
    </>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -15
```

Expected: no new errors. If `SuccessDialog` props differ, read `src/components/ui/SuccessDialog.tsx` and match the props exactly.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AddPropertyUnlisted.tsx
git commit -m "feat: add AddPropertyUnlisted wizard — saves property with is_listed: false"
```

---

## Task 5: Dashboard — Unlisted Badge + Publish Listing Button

**Files:**
- Modify: `src/pages/EnhancedLandlordDashboard.tsx`

- [ ] **Step 1: Locate the property card badge in `EnhancedLandlordDashboard.tsx`**

Search for the property card that shows "LISTED" / status badges:

```bash
grep -n "LISTED\|is_listed\|listing_type" "src/pages/EnhancedLandlordDashboard.tsx" | head -20
```

Find the property card rendering loop (search for the block that renders each property card in the list). It likely renders a badge based on `property.status`.

- [ ] **Step 2: Add unlisted badge and Publish Listing button**

In the property card render block, find where the status badge is shown. Add an unlisted badge alongside it:

```tsx
{/* After existing status badge: */}
{!property.is_listed && (
  <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-200 ml-1">
    UNLISTED
  </span>
)}
```

In the card footer/actions area (where "Manage" and "View" buttons are), add a Publish Listing button for unlisted properties:

```tsx
{!property.is_listed && (
  <Button
    size="sm"
    className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
    onClick={() => navigate(`/listing-type?propertyId=${property.id}`)}
  >
    ✦ Publish Listing
  </Button>
)}
```

Make sure `useNavigate` is already imported (it is in this file).

- [ ] **Step 3: Update the property fetch query to include `is_listed`**

In `EnhancedLandlordDashboard.tsx`, find the `supabase.from('properties')` select call that fetches the landlord's properties. It already selects `*` so `is_listed` will be returned automatically once the column exists in the DB. No query change needed.

However, `src/types/dashboard.ts` `Property` interface needs `is_listed`:

Open `src/types/dashboard.ts`, find the `Property` interface, add:

```ts
  is_listed?: boolean;
```

- [ ] **Step 4: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/EnhancedLandlordDashboard.tsx src/types/dashboard.ts
git commit -m "feat: show UNLISTED badge and Publish Listing button on private properties"
```

---

## Task 6: Public Listing Filters

Add `is_listed = true` filter to the two public listing pages so unlisted properties never appear in search.

**Files:**
- Modify: `src/pages/Properties.tsx` (line ~122)
- Modify: `src/pages/SaleListings.tsx` (line ~142)

- [ ] **Step 1: Filter `Properties.tsx`**

Find:
```ts
        .eq('status', 'available')
        .order('featured', { ascending: false })
```

Add the filter after `.eq('status', 'available')`:
```ts
        .eq('status', 'available')
        .eq('is_listed', true)
        .order('featured', { ascending: false })
```

- [ ] **Step 2: Filter `SaleListings.tsx`**

Find:
```ts
        .eq('status', 'available')
        .eq('listing_type', 'sale') // Only fetch sale listings
```

Add after:
```ts
        .eq('status', 'available')
        .eq('is_listed', true)
        .eq('listing_type', 'sale')
```

- [ ] **Step 3: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Properties.tsx src/pages/SaleListings.tsx
git commit -m "feat: hide unlisted properties from public search pages"
```

---

## Task 7: Tenant Invite Section in PropertyManagement → Tenants Tab

Creates the invite link generator and adds it to the Tenants tab for rental properties that have no active tenancy.

**Files:**
- Create: `src/components/property/TenantInviteSection.tsx`
- Modify: `src/pages/PropertyManagement.tsx`

- [ ] **Step 1: Create `src/components/property/TenantInviteSection.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link, Copy, MessageSquare, Mail } from 'lucide-react';

interface TenantInviteSectionProps {
  propertyId: string;
}

export function TenantInviteSection({ propertyId }: TenantInviteSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!monthlyRent || !leaseStart) {
      toast({ title: 'Required', description: 'Monthly rent and start date are required.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase
        .from('property_invites')
        .insert({
          property_id: propertyId,
          landlord_id: user!.id,
          monthly_rent: Number(monthlyRent),
          lease_start: leaseStart,
          lease_end: leaseEnd || null,
        })
        .select('token')
        .single();
      if (error) throw error;
      setGeneratedLink(`${window.location.origin}/join/${data.token}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`You've been invited to join a property on RentLekker. Click here to register: ${generatedLink}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Your Tenant Registration Link');
    const body = encodeURIComponent(`Hi,\n\nYou've been invited to register as a tenant. Click the link below to get started:\n\n${generatedLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (!showForm) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">👤</div>
        <div className="font-semibold text-gray-800 mb-1">No tenants yet</div>
        <div className="text-sm text-gray-500 mb-4">Invite your existing tenant to connect to this property</div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Link className="h-4 w-4 mr-2" /> Generate Tenant Invite Link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-blue-800">Set up invite link</h3>
        <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      <div>
        <Label className="text-xs font-semibold mb-1 block">Monthly Rent (R)</Label>
        <Input
          type="number"
          placeholder="12500"
          value={monthlyRent}
          onChange={e => setMonthlyRent(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold mb-1 block">Start Date</Label>
          <Input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1 block">End Date (optional)</Label>
          <Input type="date" value={leaseEnd} onChange={e => setLeaseEnd(e.target.value)} placeholder="Ongoing" />
        </div>
      </div>

      {!generatedLink ? (
        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
          {isGenerating ? 'Generating…' : 'Generate Link'}
        </Button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-green-700">✓ Link ready to share</div>
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 break-all">
            {generatedLink}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-[#25d366] hover:bg-[#1ebe5d] text-white text-xs" onClick={shareWhatsApp}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={shareEmail}>
              <Mail className="h-3.5 w-3.5 mr-1" /> Email
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `TenantInviteSection` to the Tenants tab in `PropertyManagement.tsx`**

Open `src/pages/PropertyManagement.tsx`. Find the import block and add:

```tsx
import { TenantInviteSection } from '@/components/property/TenantInviteSection';
```

Then find where `activeTab === 'tenants'` renders content (it renders `<TenantRelations property={property} />`). Add the invite section above or below the existing tenant relations component. The simplest approach: wrap in a card, show the invite section when the property is a rental and no tenants are linked yet. For now, always show it when on the tenants tab for rental properties:

Find:
```tsx
{activeTab === 'tenants' && (
  <TenantRelations property={property} />
)}
```

Replace with:
```tsx
{activeTab === 'tenants' && (
  <div className="space-y-4">
    <TenantRelations property={property} />
    {property.listing_type !== 'sale' && (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <TenantInviteSection propertyId={property.id} />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -15
```

- [ ] **Step 4: Commit**

```bash
git add src/components/property/TenantInviteSection.tsx src/pages/PropertyManagement.tsx
git commit -m "feat: add tenant invite link generator to PropertyManagement Tenants tab"
```

---

## Task 8: Tenant Join Page (`/join/:token`)

**Files:**
- Create: `src/pages/JoinPage.tsx`

- [ ] **Step 1: Create `src/pages/JoinPage.tsx`**

```tsx
// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingLogo } from '@/components/ui/LoadingLogo';

interface InviteData {
  id: string;
  property_id: string;
  landlord_id: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string | null;
  used_at: string | null;
  token: string;
}

interface PropertyData {
  id: string;
  title: string;
  location: string;
  property_type: string;
  bedrooms: number;
}

interface LandlordData {
  display_name: string;
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [landlord, setLandlord] = useState<LandlordData | null>(null);
  const [error, setError] = useState('');

  // Auth step state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Details step state
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    setLoading(true);
    const { data: inv, error: invErr } = await supabase
      .from('property_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (invErr || !inv) {
      setError('This invite link is invalid.');
      setLoading(false);
      return;
    }
    if (inv.used_at) {
      setError('This invite link has already been used.');
      setLoading(false);
      return;
    }

    setInvite(inv);

    const [{ data: prop }, { data: land }] = await Promise.all([
      supabase.from('properties').select('id, title, location, property_type, bedrooms').eq('id', inv.property_id).single(),
      supabase.from('profiles').select('display_name').eq('user_id', inv.landlord_id).single(),
    ]);

    setProperty(prop);
    setLandlord(land);
    setLoading(false);
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    let authError;
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      authError = error;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      authError = error;
    }
    setAuthLoading(false);
    if (authError) {
      toast({ title: 'Auth error', description: authError.message, variant: 'destructive' });
    }
    // useAuth hook will update `user` automatically
  };

  const handleAccept = async () => {
    if (!user || !invite || !property) return;
    if (!fullName) {
      toast({ title: 'Required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upsert profile
      await supabase.from('profiles').upsert({
        user_id: user.id,
        display_name: fullName,
        phone: phone || null,
        id_number: idNumber || null,
      }, { onConflict: 'user_id' });

      // 2. Insert tenancy
      const { error: tenancyErr } = await supabase.from('tenancies').insert({
        property_id: invite.property_id,
        landlord_id: invite.landlord_id,
        tenant_id: user.id,
        monthly_rent: invite.monthly_rent,
        start_date: invite.lease_start,
        end_date: invite.lease_end || null,
        status: 'active',
        custom_clauses: {},
      });
      if (tenancyErr) throw tenancyErr;

      // 3. Mark invite as used
      await supabase.from('property_invites').update({
        used_at: new Date().toISOString(),
        tenant_id: user.id,
      }).eq('id', invite.id);

      toast({ title: "Welcome! 🎉", description: "You've been linked to the property." });
      navigate('/enhancedtenantdashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingLogo /></div>;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const formattedRent = invite?.monthly_rent?.toLocaleString('en-ZA');
  const formattedDate = invite?.lease_start
    ? new Date(invite.lease_start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 pb-12 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        {/* Property preview */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md">
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-4 text-white">
            <div className="text-xs opacity-75 mb-1">You've been invited to</div>
            <div className="font-bold text-lg">{property?.title || property?.location}</div>
            {landlord && <div className="text-sm opacity-85 mt-0.5">by {landlord.display_name}</div>}
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">Monthly Rent</div>
              <div className="font-bold text-blue-800">R{formattedRent}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500">Move-in Date</div>
              <div className="font-bold text-blue-800">{formattedDate}</div>
            </div>
          </div>
        </div>

        {/* Auth gate (shown when not logged in) */}
        {!user && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-4">{isSignUp ? 'Create an account' : 'Sign in to continue'}</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={handleAuth} disabled={authLoading} className="w-full">
                {authLoading ? 'Loading…' : 'Continue'}
              </Button>
              <button
                className="w-full text-center text-xs text-gray-500 hover:text-blue-600"
                onClick={() => setIsSignUp(s => !s)}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        )}

        {/* Details form (shown when logged in) */}
        {user && (
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-blue-800 mb-1">Almost done — confirm your details</h3>
            <p className="text-xs text-gray-500 mb-4">This links you to the property</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Full name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">SA ID number</Label>
                <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Phone number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="mt-1" />
              </div>
              <Button
                onClick={handleAccept}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Registering…' : '✓ Accept & Register as Tenant'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -15
```

If `LoadingLogo` import fails, check exact path with:
```bash
grep -r "LoadingLogo" src --include="*.tsx" -l | head -3
```
Use the path found there.

- [ ] **Step 3: Commit**

```bash
git add src/pages/JoinPage.tsx
git commit -m "feat: add /join/:token tenant registration page"
```

---

## Task 9: Register New Routes in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports to `src/App.tsx`**

Find the last import line (around line 85) and add three new imports:

```tsx
import ListingTypePage from './pages/ListingTypePage';
import AddPropertyUnlisted from './pages/AddPropertyUnlisted';
import JoinPage from './pages/JoinPage';
```

- [ ] **Step 2: Add routes inside `<Routes>` in `src/App.tsx`**

Find an existing public route block (e.g. near the `/about/seller` route). Add the three new routes:

```tsx
<Route path="/listing-type" element={<ListingTypePage />} />
<Route path="/add-property-unlisted" element={<AddPropertyUnlisted />} />
<Route path="/join/:token" element={<JoinPage />} />
```

The `/join/:token` route must be public (no `RouteGuard`) because the tenant may not be logged in when they arrive.

- [ ] **Step 3: Build check**

```bash
cd "c:/Users/Jonathan D Theron/dwell-view-render" && npm run build 2>&1 | tail -15
```

Expected: clean build.

- [ ] **Step 4: Final commit**

```bash
git add src/App.tsx
git commit -m "feat: register /listing-type, /add-property-unlisted, /join/:token routes"
```

---

## Smoke Test Checklist

After all tasks are complete, manually verify:

- [ ] Mobile: tap "+" in bottom bar → lands on `/listing-type` with 3 cards
- [ ] Tap "List for Rent" → `/list-property` wizard (unchanged)
- [ ] Tap "List for Sale" → `/list-sale` wizard (unchanged)
- [ ] Tap "Add Property (Unlisted)" → `/add-property-unlisted` 5-step wizard
- [ ] Complete unlisted wizard → success dialog, redirect to dashboard
- [ ] Dashboard: unlisted property shows purple `UNLISTED` badge and `✦ Publish Listing` button
- [ ] Click "Publish Listing" → `/listing-type?propertyId=xxx` (cards still work)
- [ ] Properties page: unlisted property does NOT appear
- [ ] PropertyManagement → Tenants tab: "Generate Tenant Invite Link" button visible for rental properties
- [ ] Fill rent + start date → click Generate → shareable link appears
- [ ] Copy link → visit `/join/[token]` in new tab/incognito
- [ ] Join page shows property preview with rent + date
- [ ] Sign in or sign up → details form appears
- [ ] Fill name + accept → tenant dashboard redirect + success toast
- [ ] Revisit same link → "This invite link has already been used" error
