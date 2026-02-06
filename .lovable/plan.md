

# Fix Plan: Application Request Error & Mobile UI Issues

## Problem Summary

### Issue 1: Error When Confirming Application Requests
**Root Cause**: The type definitions in `src/types/application.ts` use status values (`invited`, `submitted`, `pending_credit_check`, `pending`, `accepted`, `declined`) that don't match the database constraint.

According to the database, the `application_requests` table only allows these status values:
- `pending`
- `approved`
- `rejected`

The code uses `accepted` and `declined` which violate the database check constraint `application_requests_status_check`.

**Key Files with Wrong Status Values**:
| File | Issue |
|------|-------|
| `src/types/application.ts` | Defines `accepted` and `declined` instead of `approved` and `rejected` |
| `src/components/application/ApplicationRequestCard.tsx` | Checks for `accepted` status |
| `src/constants/applicationConstants.ts` | Uses `DECLINED` instead of `REJECTED` |
| `src/hooks/useApplicationRequests.ts` | Uses the wrong type |

**Note**: `ApplicationRequestsManager.tsx` is **correct** - it uses `approved` and `rejected`.

### Issue 2: Mobile UI Problems
The `ApplicationRequestsManager.tsx` component has some mobile layout issues:
- Card content can overflow on small screens
- Text truncation needs improvement
- Button layout could be better optimized for touch targets

---

## Solution Overview

```text
Fix 1: Status Value Alignment
┌─────────────────────────────────────┐
│ Types & Constants                    │
│ ─────────────────                    │
│ OLD: 'accepted' / 'declined'        │
│ NEW: 'approved' / 'rejected'         │
└─────────────────────────────────────┘

Fix 2: Mobile UI Improvements
┌─────────────────────────────────────┐
│ ApplicationRequestsManager.tsx       │
│ ─────────────────────────────────── │
│ • Better responsive card layout     │
│ • Improved text handling            │
│ • Touch-friendly button spacing     │
│ • Proper overflow handling          │
└─────────────────────────────────────┘
```

---

## Technical Changes

### Fix 1: Update Type Definitions

**File:** `src/types/application.ts`

Change the status type from:
```typescript
export type ApplicationRequestStatus = 'invited' | 'submitted' | 'pending_credit_check' | 'pending' | 'accepted' | 'declined';
```

To:
```typescript
export type ApplicationRequestStatus = 'pending' | 'approved' | 'rejected';
```

This matches the database constraint exactly.

---

### Fix 2: Update ApplicationRequestCard.tsx

**File:** `src/components/application/ApplicationRequestCard.tsx`

Replace all instances of `accepted` with `approved` and check for the correct status:

```typescript
// OLD
const isStatusMatch = req.status === 'accepted' || 
                      req.status === ('approved' as ApplicationRequestStatus);

// NEW
const isStatusMatch = req.status === 'approved';
```

Also update:
- Status checks from `accepted` to `approved`
- Any UI text mentioning "accepted" to "approved"

---

### Fix 3: Update Constants

**File:** `src/constants/applicationConstants.ts`

Change from:
```typescript
export const APPLICATION_STATUS = {
  INVITED: 'invited',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  DECLINED: 'declined'
} as const;
```

To:
```typescript
export const APPLICATION_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;
```

Note: Keep the original `APPLICATION_STATUS` if it's used for the separate `applications` table which may have different constraints.

---

### Fix 4: Mobile UI Improvements

**File:** `src/components/landlord/ApplicationRequestsManager.tsx`

**Changes for better mobile layout:**

1. **Card Container** - Add horizontal overflow protection:
```typescript
<Card className="overflow-hidden w-full">
```

2. **CardContent** - Improve padding and spacing for mobile:
```typescript
<CardContent className="space-y-4 px-3 sm:px-6">
```

3. **Inner Card** - Better border and overflow handling:
```typescript
<Card key={request.id} className="border shadow-sm overflow-hidden">
  <CardContent className="p-3 sm:p-4">
```

4. **Request Info Layout** - Stack vertically on mobile, add proper truncation:
```typescript
<div className="space-y-3">
  <div className="min-w-0">
    <div className="flex items-center gap-2 mb-1">
      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <p className="font-semibold text-sm sm:text-base truncate">
        {request.profiles?.display_name || 'Unknown Tenant'}
      </p>
    </div>
    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
      <Home className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <p className="truncate">{request.properties?.title || 'Unknown Property'}</p>
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      Requested {new Date(request.created_at).toLocaleDateString()}
    </p>
  </div>
```

5. **Button Layout** - Full-width stacked buttons on mobile:
```typescript
<div className="flex flex-col gap-2 pt-2">
  <Button
    size="sm"
    onClick={() => handleApprove(request)}
    disabled={processingId === request.id}
    className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
  >
    {/* ... */}
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleDecline(request)}
    disabled={processingId === request.id}
    className="w-full h-10"
  >
    {/* ... */}
  </Button>
</div>
```

6. **Header** - Responsive title:
```typescript
<CardTitle className="flex items-center gap-2 text-base sm:text-lg">
  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
  <span className="truncate">Application Requests</span>
  <Badge variant="secondary" className="ml-auto flex-shrink-0">{requests.length}</Badge>
</CardTitle>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/application.ts` | Update `ApplicationRequestStatus` to only allow `pending`, `approved`, `rejected` |
| `src/components/application/ApplicationRequestCard.tsx` | Replace `accepted` → `approved`, improve status checks |
| `src/constants/applicationConstants.ts` | Add `APPLICATION_REQUEST_STATUS` with correct values |
| `src/components/landlord/ApplicationRequestsManager.tsx` | Mobile UI improvements: responsive padding, stacked buttons, better truncation |

---

## Testing Recommendations

After implementation:

1. **Landlord Approve/Decline Flow**:
   - Log in as a landlord
   - Navigate to Application Requests section
   - Click "Approve" on a pending request
   - Verify no error appears and status updates correctly
   - Click "Decline" on another request
   - Verify no error and status updates to "rejected"

2. **Mobile Testing**:
   - View Application Requests on mobile viewport (375px width)
   - Verify cards don't overflow horizontally
   - Verify buttons are full-width and easy to tap
   - Verify tenant names and property titles are properly truncated

3. **Tenant Side**:
   - Log in as a tenant
   - View an approved application request
   - Verify "Start Application" button appears correctly

