

# Fix Plan: Lease Visibility, Application Approval & Maintenance Requests

## Summary of Issues Found

### Issue 1: Lease Not Showing for Tenant to Sign
**Root Cause**: Two potential problems:
1. The tenant might not see leases with `pending_tenant` status because the dashboard only checks for `signed` leases in the fallback
2. The `tenant_id` is set to the **auth user ID** by the edge function, but the tenant dashboard query needs to match this correctly

### Issue 2: Application Request Approval Error  
**Root Cause**: The `applicationRequestService.ts` is trying to update a column called `updated_by` that **does not exist** in the `application_requests` database table. According to the database types, the table only has: `created_at`, `id`, `landlord_id`, `property_id`, `status`, `tenant_id`, `updated_at`.

### Issue 3: Maintenance Request Creation
**Root Cause**: The current fallback logic is correct, but could be improved. The main issue might be that no `tenantProperty` is being set if neither a tenancy nor a signed lease exists.

---

## Solution Details

### Fix 1: Remove `updated_by` from Application Request Update

**File:** `src/services/applicationRequestService.ts`

The `updateApplicationRequestStatus` function is sending `updated_by: userId` which doesn't exist as a column:

```typescript
// CURRENT (broken)
.update({ 
  status,
  updated_at: new Date().toISOString(),
  updated_by: userId  // ❌ This column doesn't exist!
})

// FIXED
.update({ 
  status,
  updated_at: new Date().toISOString()
  // Remove updated_by entirely
})
```

---

### Fix 2: Fix Tenant Lease Visibility

**File:** `src/hooks/useLeaseContracts.ts`

The query needs to fetch leases where:
- The user is the landlord, OR
- The user is the tenant (set via `tenant_id`)

But there's a potential issue: the `tenant_id` column contains **profile IDs** based on the foreign key, but the edge function is setting **auth user IDs**. Let me verify:

Looking at the edge function:
```typescript
tenantUserId = existingUser.id;  // This is auth.users.id
// Then sets:
tenant_id: tenantUserId  // This gets set to auth.users.id
```

But the table's foreign key is:
```typescript
foreignKeyName: "lease_contracts_tenant_id_fkey"
referencedRelation: "profiles"  // Points to profiles.id, not auth.users.id!
```

This means there's a **mismatch** - the edge function is storing auth user IDs but the foreign key expects profile IDs. However, since we're not enforcing the FK strictly, it may work but cause lookup issues.

**The fix**: The edge function should look up or create the **profile ID** and use that, OR the query should also check by email/auth_id.

For now, the simplest fix is to ensure the lease query also catches `pending_tenant` status:

**File:** `src/hooks/useTenantDashboard.tsx`

Add check for `pending_tenant` status in the lease fallback:

```typescript
// Instead of only checking 'signed' status
.in('status', ['signed', 'pending_tenant'])
```

---

### Fix 3: Ensure Maintenance Fallback Works Correctly

**File:** `src/pages/tenant/TenantMaintenance.tsx`

The current code already has good fallback logic. However, we should also check for `pending_tenant` leases since a tenant may have been sent a lease but not yet signed it:

```typescript
// Add pending_tenant to the lease lookup
.in('status', ['signed', 'pending_tenant'])
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/applicationRequestService.ts` | Remove `updated_by` from the update call |
| `src/hooks/useTenantDashboard.tsx` | Include `pending_tenant` status in lease lookup fallback |
| `src/pages/tenant/TenantMaintenance.tsx` | Include `pending_tenant` status in lease lookup fallback |

---

## Technical Changes

### Change 1: applicationRequestService.ts

```typescript
// Line 53-66: Fix the update function
export const updateApplicationRequestStatus = async (
  id: string, 
  status: ApplicationRequestStatus,
  userId: string
): Promise<ApplicationRequest> => {
  const { data, error } = await supabase
    .from('application_requests')
    .update({ 
      status,
      updated_at: new Date().toISOString()
      // Remove: updated_by: userId (column doesn't exist)
    })
    .eq('id', id)
    .select('*')
    .single();
  // ...
};
```

### Change 2: useTenantDashboard.tsx

```typescript
// Line 122-131: Update the fallback lease query
const { data: leaseData, error: leaseError } = await supabase
  .from('lease_contracts')
  .select('property_id, contract_data')
  .eq('tenant_id', user.id)
  .in('status', ['signed', 'pending_tenant'])  // Include pending_tenant
  .not('property_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

### Change 3: TenantMaintenance.tsx

```typescript
// Line 92-100: Update the fallback lease query
const { data: leaseData } = await supabase
  .from('lease_contracts')
  .select('property_id')
  .eq('tenant_id', user.id)
  .in('status', ['signed', 'pending_tenant'])  // Include pending_tenant
  .not('property_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## Why These Changes Fix the Issues

1. **Application Approval Error**: Removing `updated_by` eliminates the database error about an unknown column. The update will now succeed.

2. **Lease Visibility**: By including `pending_tenant` in the status filter, tenants will see leases that are awaiting their signature, not just already-signed ones.

3. **Maintenance Requests**: The same change allows tenants to create maintenance requests even before they've signed the lease (as long as they've been sent one).

---

## Testing Checklist

After implementation:
1. **Application Approval**: Log in as landlord → Go to Application Requests → Click "Approve" → Verify no error occurs
2. **Lease Visibility**: Log in as tenant after landlord sends lease → Navigate to Leases tab → Verify the pending lease appears
3. **Maintenance Requests**: Log in as tenant with pending lease → Navigate to Maintenance → Click "New Request" → Verify the form appears without "No Property Assigned" error

