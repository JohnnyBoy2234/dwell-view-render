
# Fix Plan: Inventory Saving, Payments Status, Mobile Popups & Lease Auto-Save

## Summary of Issues

### Issue 1: Inventory Voice Notes & Data Not Saving
**Root Cause Analysis:**
- The `InventoryStartPanel.tsx` saves data correctly when the user clicks "Save"
- However, if the user navigates away WITHOUT clicking "Save", their data is lost
- There is NO auto-save functionality - data only persists after explicit save
- The issue is that `notes` state is local and gets cleared on navigation

**Current Behavior:**
- Voice notes/photos stored in local state (`useState`)
- User must manually click "Save" button
- If they leave the page without saving, all data is lost
- No warning about unsaved changes when navigating away

### Issue 2: Payments Tab Shows "Waiting for Lease" After Signing
**Root Cause Analysis:**
- The `TenantPayments.tsx` page displays rent information based on `rentDue` from `useTenantDashboard`
- If no active tenancy or pending rent payment exists, it shows the payment info cards but no "waiting for lease" message
- Looking at the code, there's no explicit "waiting for lease" text in the payments page
- The actual issue is likely the `tenantProperty` being null, causing the rent section not to show properly

After reviewing the code more carefully:
- The `TenantPayments.tsx` doesn't show "waiting for lease" text
- The issue may be elsewhere in the dashboard - likely on the main dashboard overview

**Note:** Need to search for where "waiting for lease" appears in the UI.

### Issue 3: Pop-ups Not Properly Aligned on Mobile
**Root Cause Analysis:**
- The `SuccessDialog` uses `DialogContent` with className `sm:max-w-md mx-4 p-0 overflow-hidden`
- The base `DialogContent` in `dialog.tsx` uses `fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`
- This centering approach can cause issues on mobile when:
  - The viewport is small
  - The keyboard opens
  - Content overflows
- Missing safe area insets for mobile devices
- No `max-height` constraints with proper overflow handling

### Issue 4: Lease Auto-Save for Landlords
**Root Cause Analysis:**
- `SALeaseWizard.tsx` currently saves on "Next" button click via `saveProgress()`
- No periodic/debounced auto-save as the user types
- If user closes browser mid-step without clicking "Next", data is lost

---

## Solution Details

### Fix 1: Auto-Save Inventory Data

**Files to Modify:**
- `src/components/property/InventoryStartPanel.tsx`

**Changes:**
1. Add a `beforeunload` event listener to warn about unsaved changes
2. Implement debounced auto-save (every 30 seconds when there are unsaved changes)
3. Add localStorage backup for immediate recovery on page refresh

```typescript
// Add useEffect for beforeunload warning
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);

// Add auto-save with debounce (30 seconds)
useEffect(() => {
  if (!hasUnsavedChanges || saving) return;
  const autoSaveTimer = setTimeout(() => {
    handleSave();
  }, 30000); // 30 seconds
  return () => clearTimeout(autoSaveTimer);
}, [hasUnsavedChanges, notes]);
```

### Fix 2: Investigate Payments Status Message

**Investigation needed:**
The "waiting for lease" message isn't in `TenantPayments.tsx`. Need to search for where this text exists and update the logic to check for signed leases correctly.

After checking, this message likely comes from:
- The main tenant dashboard
- Or a conditional render based on `tenantProperty` being null

**Fix:** Ensure the `useTenantDashboard` hook's lease lookup includes `pending_tenant` status (already fixed in previous changes).

### Fix 3: Mobile Pop-up Alignment

**Files to Modify:**
- `src/components/ui/dialog.tsx` - Base dialog component
- `src/components/ui/SuccessDialog.tsx` - Success dialog specifically

**Changes to `dialog.tsx`:**
```typescript
// Update DialogContent to be more mobile-friendly
<DialogPrimitive.Content
  ref={ref}
  className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200",
    // Add mobile-specific styles
    "max-h-[calc(100vh-2rem)] overflow-y-auto mx-4 sm:mx-0",
    // Safe area for mobile
    "pb-[env(safe-area-inset-bottom)]",
    // Animations
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg rounded-lg",
    className
  )}
  {...props}
>
```

**Changes to `SuccessDialog.tsx`:**
```typescript
// Line 136: Update DialogContent className
<DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] p-0 overflow-hidden rounded-xl">
```

### Fix 4: Lease Wizard Auto-Save

**Files to Modify:**
- `src/components/lease/SALeaseWizard.tsx`

**Changes:**
1. Add debounced auto-save that triggers when `data` changes
2. Show an "auto-saving" indicator in the UI

```typescript
// Add auto-save effect after the updateData function
const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

useEffect(() => {
  if (!user || !data || JSON.stringify(data) === JSON.stringify(DEFAULT_WIZARD_DATA)) return;
  
  setAutoSaveStatus('saving');
  const autoSaveTimer = setTimeout(async () => {
    await saveProgress();
    setAutoSaveStatus('saved');
    // Reset to idle after 2 seconds
    setTimeout(() => setAutoSaveStatus('idle'), 2000);
  }, 2000); // 2 second debounce
  
  return () => clearTimeout(autoSaveTimer);
}, [data]);

// Add visual indicator near the progress bar
{autoSaveStatus === 'saving' && (
  <span className="text-xs text-muted-foreground">Saving...</span>
)}
{autoSaveStatus === 'saved' && (
  <span className="text-xs text-success-green">Saved</span>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/property/InventoryStartPanel.tsx` | Add auto-save (30s debounce), beforeunload warning, localStorage backup |
| `src/components/ui/dialog.tsx` | Improve mobile positioning with max-height, overflow, safe areas |
| `src/components/ui/SuccessDialog.tsx` | Better mobile-responsive DialogContent styling |
| `src/components/lease/SALeaseWizard.tsx` | Add debounced auto-save (2s), visual save indicator |

---

## Technical Implementation Details

### Inventory Auto-Save Flow

```text
User records voice note / adds photo
         │
         ▼
   notes state updates
   hasUnsavedChanges = true
         │
         ├──────────────────────────────────────┐
         ▼                                      ▼
  30-second auto-save timer starts    beforeunload listener active
         │                                      │
         ▼                                      ▼
  handleSave() called automatically    Warns user if leaving
         │
         ▼
  Data persisted to Supabase
  hasUnsavedChanges = false
```

### Lease Auto-Save Flow

```text
User types in form field
         │
         ▼
  updateData() called
  data state changes
         │
         ▼
  2-second debounce starts
  autoSaveStatus = 'saving'
         │
         ▼
  saveProgress() called
         │
         ▼
  autoSaveStatus = 'saved'
  (shows "Saved" for 2 seconds)
```

### Mobile Dialog Positioning

```text
┌─────────────────────────────────────┐
│          Safe Area (top)            │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │    Dialog Content           │    │
│  │    - max-h with overflow    │    │
│  │    - rounded corners        │    │
│  │    - proper margins         │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│        Safe Area (bottom)           │
└─────────────────────────────────────┘
```

---

## Inventory Visibility for Both Tenant and Landlord

The current implementation already supports this:

**Tenant View (`useInventory.tsx`):**
```typescript
.eq('tenant_id', user.id)  // Fetches tenant's own records
```

**Landlord View (`EnhancedLandlordDashboard.tsx`):**
```typescript
.eq('landlord_id', user.id)  // Fetches records for landlord's properties
```

**Key:** When saving inventory, the `landlord_id` is set from the property owner, ensuring landlords can see tenant-submitted inventory.

---

## Testing Checklist

After implementation:

1. **Inventory Auto-Save:**
   - Record a voice note, wait 30 seconds, verify it saves automatically
   - Add photos, try to close tab, verify warning appears
   - Close and reopen page, verify data persists

2. **Payments Tab:**
   - Sign a lease as tenant
   - Navigate to Payments tab
   - Verify rent information displays correctly

3. **Mobile Popups:**
   - Open app on mobile device
   - Trigger a success dialog
   - Verify it's centered and scrollable
   - Verify safe areas respected

4. **Lease Auto-Save:**
   - Start filling out lease as landlord
   - Type in a field, wait 2 seconds
   - Verify "Saved" indicator appears
   - Close tab and return, verify data persisted
