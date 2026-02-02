

# Plan: Agency Signup Redesign, Rent/Buy Navigation, and Agency Agent Management

## Overview

This plan covers four major feature areas:
1. **Agency Signup Page Redesign** - Modern, professional design inspired by RE/MAX and Seeff
2. **Rent/Buy Navigation & Search** - Add "Rent" and "Buy" buttons with filtered property search
3. **Agency Dashboard with Agent Management** - Create sub-accounts for agents
4. **Sales Listings** - Allow agencies to list properties for sale with agent assignment

---

## Part 1: Agency Signup Page Redesign

### Current State
The current agency onboarding page (`src/pages/agency/AgencyOnboarding.tsx`) is a simple multi-step form in a single card layout. It lacks visual appeal and branding.

### Inspiration Analysis
- **RE/MAX**: Hero section with inspiring headline, form card on right, dark blue diagonal background, simple form fields
- **Seeff**: Full-width hero image with team photo, "Start your new story" headline, value proposition cards below

### New Design Approach

**Layout Structure:**
```
+----------------------------------------------------------+
| Hero Section (Full-width gradient background)            |
|  +------------------+  +---------------------------+     |
|  | Left: Headline   |  | Right: Simple Form Card   |     |
|  | "Grow Your       |  | Name & Surname            |     |
|  |  Business with   |  | Mobile Number             |     |
|  |  RentLekker"     |  | Email                     |     |
|  |                  |  | Agency Name               |     |
|  | Key benefits:    |  | Province (select)         |     |
|  | - Commission-free|  | [Get Started Button]      |     |
|  | - Full support   |  |                           |     |
|  | - Easy onboarding|  +---------------------------+     |
|  +------------------+                                    |
+----------------------------------------------------------+
| Value Proposition Section (3 cards)                      |
+----------------------------------------------------------+
| Footer CTA                                               |
+----------------------------------------------------------+
```

### Files to Modify/Create

| File | Action |
|------|--------|
| `src/pages/agency/AgencyOnboarding.tsx` | Complete redesign |
| `src/components/agency/AgencySignupForm.tsx` | **Create** - Extract form logic |
| `src/components/agency/AgencyValueProps.tsx` | **Create** - Value proposition cards |

### Key Changes
- Full-width hero with dark blue gradient background (matching brand)
- Form card floats on the right side
- Simplify initial form: Name, Phone, Email, Agency Name, Province
- "Get Started" button creates draft and redirects to document upload step
- Add testimonials/stats section below hero
- Mobile: Stack form below headline

---

## Part 2: Rent/Buy Navigation & Property Search

### Current State
- Navbar has "Find Rental" link pointing to `/properties`
- Homepage search bar searches all properties
- No distinction between rental and sale properties
- Database `properties` table lacks `listing_type` column

### New Navigation Structure

**Navbar Changes:**
```
Current: Home | Safe Renting | Find Rental | Pricing | Blog | About | Contact
New:     Home | Safe Renting | Rent | Buy | Pricing | Blog | About | Contact
```

### Homepage Search Enhancement

**Add toggle buttons above search bar:**
```
+--------------------------------------------------+
|           [  Rent  ] [  Buy  ]                   |
|  +--------------------------------------------+  |
|  | Search by city, suburb...           [Search]  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

### Database Changes

**Add `listing_type` column to properties:**
```sql
ALTER TABLE properties ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'rent' 
  CHECK (listing_type IN ('rent', 'sale'));
CREATE INDEX idx_properties_listing_type ON properties(listing_type);
```

### Filter Logic Updates

| File | Changes |
|------|---------|
| `src/constants/navbarConstants.ts` | Change "Find Rental" to "Rent", add "Buy" item |
| `src/hooks/usePropertySearchFilters.tsx` | Add `listingType` filter |
| `src/pages/Properties.tsx` | Filter by `listing_type` from URL params |
| `src/pages/Index.tsx` | Add Rent/Buy toggle above search |
| `src/components/search/Property24SearchBar.tsx` | Accept `listingType` prop |

### URL Structure
- `/properties?type=rent` - Show only rentals
- `/properties?type=sale` - Show only sales
- `/properties` - Default to rent (for backwards compatibility)

---

## Part 3: Agency Dashboard & Agent Management

### New Pages & Components

**Agency Dashboard Route:** `/agency/dashboard`

**Dashboard Layout:**
```
+----------------------------------------------------------+
| Agency: [Agency Name]                    [Status Badge]  |
+----------------------------------------------------------+
| Quick Actions:                                           |
| [+ Add Agent] [+ List Property for Sale] [+ List Rental] |
+----------------------------------------------------------+
| Tabs: Agents | Properties | Settings                     |
+----------------------------------------------------------+
| Agents Tab:                                              |
| +--------------------------------------------------+     |
| | Agent Avatar | Name | Email | Phone | Properties |     |
| | [Edit] [Deactivate]                              |     |
| +--------------------------------------------------+     |
+----------------------------------------------------------+
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/agency/AgencyDashboard.tsx` | Main agency dashboard |
| `src/components/agency/AgentsList.tsx` | List of agents with CRUD |
| `src/components/agency/AddAgentModal.tsx` | Create agent sub-account |
| `src/components/agency/AgencyPropertiesList.tsx` | Agency property management |
| `src/pages/agency/ListPropertyForSale.tsx` | Sale listing wizard |

### Add Agent Flow

**Modal Fields:**
- Full Name (display_name)
- Email (creates auth account)
- Mobile Number
- Profile Photo (optional)
- Assigned Areas (optional)

**Backend Flow:**
1. Create auth user via Supabase Admin API (edge function)
2. Insert into `profiles` table
3. Insert into `agency_members` (role: 'agent')
4. Insert into `agent_profiles` with display info

### Edge Function Required

**File:** `supabase/functions/create-agent-account/index.ts`

Creates agent sub-accounts:
```typescript
// 1. Create auth user with email/password
// 2. Create profile
// 3. Add to agency_members with 'agent' role
// 4. Create agent_profile entry
```

---

## Part 4: Sales Listings with Agent Assignment

### Database Changes

**Update properties table:**
```sql
ALTER TABLE properties ADD COLUMN agent_id UUID REFERENCES auth.users(id);
ALTER TABLE properties ADD COLUMN agency_id UUID REFERENCES agencies(id);
```

### New Sale Listing Wizard

Similar to `ListProperty.tsx` but with:
- `listing_type` = 'sale'
- Agent selection dropdown (shows agency's agents)
- Sale price instead of monthly rent
- ERF size, rates, levies fields

### Property Detail Display

When viewing a property for sale with an assigned agent:
```
+--------------------------------------------------+
| Property Details...                              |
+--------------------------------------------------+
| Contact Agent:                                   |
| +----------------------------------------------+ |
| | [Avatar] Agent Name                          | |
| | [Agency Logo] Agency Name                    | |
| | Phone: +27 xxx xxx xxxx                      | |
| | Email: agent@agency.com                      | |
| | [Call] [Email] [WhatsApp]                    | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### Files to Create/Modify

| File | Action |
|------|---------|
| `src/pages/agency/ListPropertyForSale.tsx` | **Create** - Sale listing wizard |
| `src/components/property/AgentContactCard.tsx` | **Create** - Agent info display |
| `src/pages/PropertyDetail.tsx` | **Modify** - Show agent card if assigned |
| `src/components/listing/AgentSelectStep.tsx` | **Create** - Agent selection UI |

---

## Implementation Order

### Phase 1: Database Foundation
1. Create migration to add `listing_type` column to properties
2. Create migration to add `agent_id` and `agency_id` columns
3. Update RLS policies for agency property management

### Phase 2: Navigation & Search
1. Update `navbarConstants.ts` - Change "Find Rental" to "Rent", add "Buy"
2. Update `usePropertySearchFilters.tsx` - Add `listingType` filter
3. Update `Index.tsx` - Add Rent/Buy toggle buttons
4. Update `Properties.tsx` - Filter by listing type
5. Update search bar component

### Phase 3: Agency Signup Redesign
1. Create `AgencySignupForm.tsx` component
2. Create `AgencyValueProps.tsx` component
3. Redesign `AgencyOnboarding.tsx` with new layout

### Phase 4: Agency Dashboard
1. Create `AgencyDashboard.tsx` page
2. Create `AgentsList.tsx` component
3. Create `AddAgentModal.tsx` component
4. Create edge function for agent creation
5. Add routes for agency dashboard

### Phase 5: Sales Listings
1. Create `ListPropertyForSale.tsx` wizard
2. Create `AgentSelectStep.tsx` component
3. Create `AgentContactCard.tsx` component
4. Update `PropertyDetail.tsx` to show agent info

---

## Technical Details

### Migration: Add listing_type and agency fields

```sql
-- Add listing type to properties
ALTER TABLE properties 
ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'rent' 
CHECK (listing_type IN ('rent', 'sale'));

-- Add agent/agency references
ALTER TABLE properties 
ADD COLUMN agent_id UUID REFERENCES auth.users(id),
ADD COLUMN agency_id UUID REFERENCES agencies(id);

-- Indexes
CREATE INDEX idx_properties_listing_type ON properties(listing_type);
CREATE INDEX idx_properties_agent_id ON properties(agent_id);
CREATE INDEX idx_properties_agency_id ON properties(agency_id);

-- RLS: Agency admins can manage their agency's properties
CREATE POLICY "Agency admins can manage agency properties"
ON properties FOR ALL
USING (
  agency_id IS NOT NULL 
  AND public.is_agency_admin(agency_id)
);
```

### Route Updates

```typescript
// Add to App.tsx or router config
<Route path="/agency/dashboard" element={<AgencyDashboard />} />
<Route path="/agency/list-for-sale" element={<ListPropertyForSale />} />
```

### Navbar Constants Update

```typescript
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/safe-renting", label: "Safe Renting", icon: Shield },
  { path: "/properties?type=rent", label: "Rent", icon: Search },
  { path: "/properties?type=sale", label: "Buy", icon: Search },
  { path: "/pricing", label: "Pricing", icon: BadgeDollarSign },
  { path: "/blog", label: "Blog", icon: Send },
  { path: "/about", label: "About", icon: Send },
  { path: "/contact", label: "Contact", icon: Send }
];
```

---

## Files Summary

### Files to Create (13 files)
| File | Purpose |
|------|---------|
| `src/components/agency/AgencySignupForm.tsx` | Registration form component |
| `src/components/agency/AgencyValueProps.tsx` | Value proposition cards |
| `src/pages/agency/AgencyDashboard.tsx` | Agency admin dashboard |
| `src/components/agency/AgentsList.tsx` | Agents table with actions |
| `src/components/agency/AddAgentModal.tsx` | Create agent modal |
| `src/components/agency/AgencyPropertiesList.tsx` | Agency properties view |
| `src/pages/agency/ListPropertyForSale.tsx` | Sale listing wizard |
| `src/components/listing/AgentSelectStep.tsx` | Agent selection step |
| `src/components/property/AgentContactCard.tsx` | Agent contact display |
| `supabase/functions/create-agent-account/index.ts` | Agent creation edge function |
| `supabase/migrations/XXXXXX_add_listing_type.sql` | Database migration |
| `src/components/home/RentBuyToggle.tsx` | Rent/Buy toggle component |

### Files to Modify (8 files)
| File | Changes |
|------|---------|
| `src/pages/agency/AgencyOnboarding.tsx` | Complete redesign |
| `src/constants/navbarConstants.ts` | Update nav items |
| `src/hooks/usePropertySearchFilters.tsx` | Add listingType filter |
| `src/pages/Properties.tsx` | Filter by listing type |
| `src/pages/Index.tsx` | Add Rent/Buy toggle |
| `src/components/search/Property24SearchBar.tsx` | Accept listingType |
| `src/pages/PropertyDetail.tsx` | Show agent contact |
| `src/pages/ListProperty.tsx` | Add listing_type default |

---

## User Experience Summary

### For Property Seekers
- Clear "Rent" and "Buy" navigation options
- Homepage toggle to switch between rental and sale search
- Properties page filters by listing type automatically
- Contact agent directly for sale properties

### For Agencies
- Beautiful, professional signup page
- Dashboard to manage agents and properties
- One-click agent sub-account creation
- Assign agents to sale listings
- Agent info displays on property pages

### For Agents
- Receive login credentials from agency admin
- Listed on property pages with contact info
- Can be assigned to multiple properties
- Profile managed by agency admin

