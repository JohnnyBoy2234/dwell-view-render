
# Fix Plan: Lease Display in Management Tools & Tenant Property Assignment

## Problem Summary

### Issue 1: Leases Not Showing in Property Management Tools
When landlords create leases for a property, those leases don't appear in the lease tile under the property's management tools. This happens because:
- The `LeaseBuilder.tsx` page reads `propertyId` from URL path parameters using `useParams()`
- However, the "Create Lease" button in `ApplicationsWithViewings.tsx` passes `propertyId` as a **query parameter** (`?propertyId=...`)
- Result: `propertyId` is `undefined` when saving the lease, so the `property_id` column is never set

### Issue 2: "No Property Assigned" Error for Tenant Maintenance
After a tenant signs a lease, they get an error when trying to create a maintenance request because:
- The `useTenantDashboard` hook looks for active tenancy records in the `tenancies` table
- When a lease is signed, no tenancy record is created
- Without a tenancy record, the system can't determine which property the tenant is associated with

---

## Solution Overview

```text
PROBLEM 1 FIX:
┌─────────────────┐     ┌─────────────────────┐
│ Create Lease    │ --> │ LeaseBuilder reads  │ --> Lease saved
│ (uses ?param)   │     │ both :param AND     │     WITH property_id
│                 │     │ ?param              │
└─────────────────┘     └─────────────────────┘

PROBLEM 2 FIX:
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│ Both parties    │ --> │ Create tenancy      │ --> │ Tenant can      │
│ sign lease      │     │ record              │     │ access property │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
```

---

## Technical Changes

### Fix 1: LeaseBuilder Should Read Query Params

**File:** `src/pages/LeaseBuilder.tsx`

Currently the page only reads URL path params:
```typescript
const { contractId, propertyId } = useParams();
```

Change to also read from query params (which is how `ApplicationsWithViewings.tsx` passes it):
```typescript
const { contractId, propertyId: pathPropertyId } = useParams();
const [searchParams] = useSearchParams();
const propertyId = pathPropertyId || searchParams.get('propertyId');
```

---

### Fix 2: Create Tenancy When Lease is Fully Signed

When both landlord and tenant have signed the lease, the system needs to create a tenancy record to link the tenant to the property.

**File:** `src/pages/LeaseSignature.tsx`

After both parties have signed (inside `handleTenantSign`), add logic to:
1. Create a tenancy record in the `tenancies` table
2. Set the tenant's property assignment

```typescript
// After both parties have signed, create tenancy record
if (bothSigned) {
  // Create tenancy record
  await supabase.from('tenancies').insert({
    property_id: contract.property_id,
    tenant_id: user.id,
    landlord_id: contract.landlord_id,
    start_date: wizardData.leaseStartDate,
    end_date: wizardData.leaseEndDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    monthly_rent: wizardData.rentAmount,
    security_deposit: wizardData.depositAmount,
    status: 'active',
    lease_document_url: contract.pdf_url
  });
}
```

---

### Fix 3: Update SALeaseWizard to Create Tenancy on Completion

When the tenant signs via the SALeaseWizard (if landlord signature was already captured), create the tenancy there as well.

**File:** `src/components/lease/SALeaseWizard.tsx`

Same logic applies - after tenant signature completes the lease, create a tenancy record.

---

### Fix 4: Add Fallback in useTenantDashboard

The `useTenantDashboard` hook should also check `lease_contracts` as a fallback if no tenancy exists.

**File:** `src/hooks/useTenantDashboard.tsx`

Add a secondary query to check for signed leases if no active tenancy is found:
```typescript
// If no tenancy found, check for signed lease contracts
if (!tenancyData) {
  const { data: leaseData } = await supabase
    .from('lease_contracts')
    .select('property_id, contract_data, properties(id, title, location, images)')
    .eq('tenant_id', user.id)
    .eq('status', 'signed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (leaseData?.properties) {
    // Set tenant property from lease contract
  }
}
```

---

### Fix 5: Update TenantMaintenance.tsx Fallback Logic

Currently falls back to a placeholder `'no-property-assigned'` which causes issues. Instead:

**File:** `src/pages/tenant/TenantMaintenance.tsx`

Improve the fallback to check `lease_contracts` before giving up:
```typescript
// Check for signed lease if no active tenancy
if (!propertyId) {
  const { data: leaseData } = await supabase
    .from('lease_contracts')
    .select('property_id')
    .eq('tenant_id', user.id)
    .eq('status', 'signed')
    .not('property_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (leaseData?.property_id) {
    propertyId = leaseData.property_id;
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/LeaseBuilder.tsx` | Read `propertyId` from both URL params AND query params |
| `src/pages/LeaseSignature.tsx` | Create tenancy record when both parties have signed |
| `src/components/lease/SALeaseWizard.tsx` | Ensure property_id is saved, create tenancy on completion |
| `src/hooks/useTenantDashboard.tsx` | Add fallback to check `lease_contracts` for signed leases |
| `src/pages/tenant/TenantMaintenance.tsx` | Improve property lookup fallback |

---

## Data Flow After Fix

```text
1. Landlord creates lease from application
   └─> LeaseBuilder reads propertyId from query param
       └─> Lease saved WITH property_id ✓

2. Landlord signs lease
   └─> Status: pending_tenant

3. Tenant signs lease
   └─> Status: signed
   └─> Tenancy record created ✓
       └─> property_id linked
       └─> tenant_id linked
       └─> landlord_id linked
       └─> Rent amount, dates, deposit stored

4. Tenant opens maintenance
   └─> useTenantDashboard finds tenancy
   └─> tenantProperty is populated ✓
   └─> Maintenance request created with correct property_id ✓
```

---

## Edge Cases Handled

1. **Old leases without property_id**: The fallback query in `useTenantDashboard` handles this by also checking lease contracts
2. **Query params vs path params**: LeaseBuilder checks both, so either navigation method works
3. **Month-to-month leases**: Uses a default end date 1 year from start if no end date specified
4. **Missing lease data**: Graceful fallbacks with sensible defaults for rent and dates

---

## Testing Recommendations

After implementation:
1. Create a new lease from an approved application
2. Verify the lease appears in the property's management tools
3. Complete the signing flow as both landlord and tenant
4. Try to create a maintenance request as the tenant
5. Verify the maintenance request is linked to the correct property
