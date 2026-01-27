
## Plan: Lease Preview Popup with In-Document Signing Flow

### Problem Summary
1. **Text overflow issue**: The lease text currently "runs off the page" - needs proper text wrapping and scroll handling
2. **Current flow is PDF-first**: Users generate a PDF before signing, which isn't ideal
3. **Disconnected signing experience**: Signatures are captured on a separate page, not on the actual lease document

### New Flow Overview

```text
LANDLORD JOURNEY:
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Complete   │ -> │  Click "Preview  │ -> │ Read full lease │ -> │ Sign at the  │
│  10 Steps   │    │  & Sign Lease"   │    │ in popup modal  │    │ bottom       │
└─────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
                                                    │
                                                    v
                                           ┌─────────────────┐
                                           │ Send to Tenant  │
                                           └─────────────────┘

TENANT JOURNEY:
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Receives   │ -> │  Clicks "View    │ -> │ Reads full lease│ -> │ Signs at the │
│  Email/Link │    │  Lease"          │    │ in popup modal  │    │ bottom       │
└─────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
                                                    │
                                                    v
                                           ┌─────────────────────────┐
                                           │ Both signed -> PDF with │
                                           │ signatures is generated │
                                           └─────────────────────────┘
```

---

### What Changes

| Current Flow | New Flow |
|--------------|----------|
| Generate PDF first | View lease as HTML popup first |
| Sign on separate page | Sign directly in the popup |
| PDF without visible signatures | PDF includes signature images |
| Landlord and tenant use different pages | Same popup component for both |

---

### Technical Implementation

#### Step 1: Create LeasePreviewModal Component

**New File:** `src/components/lease/LeasePreviewModal.tsx`

A full-screen modal that:
- Renders the processed lease template as formatted HTML
- Fixes text overflow with proper CSS (word-wrap, overflow handling)
- Includes scroll area for the full legal text
- Shows signature section at the bottom with canvas
- Has consent checkbox before signing
- Supports both landlord and tenant modes

Key Features:
- `max-w-5xl` width for readable legal text
- `max-h-[90vh]` with `ScrollArea` for long documents
- `whitespace-pre-wrap` and `break-words` for proper text handling
- Signature canvas integrated at the bottom of the lease content
- Clear "This is not yet legally binding" indicator until signed

#### Step 2: Create Lease HTML Renderer

**New File:** `src/utils/leaseHtmlRenderer.ts`

Utility to convert the processed template text into clean, readable HTML:
- Convert section headers to styled headings
- Convert tables to proper HTML tables
- Apply proper typography and spacing
- Handle the template's `===` and `---` separators as visual dividers
- Style conditionally-included sections properly

#### Step 3: Update Step 10 (Review & Generate)

**Modify:** `src/components/lease/steps-sa/Step10ReviewGenerate.tsx`

Change the buttons from:
- "Generate PDF" and "Send to Tenant"

To:
- "Preview & Sign Lease" (opens the new popup)
- Keep "Download PDF" as secondary (only after signing)

Flow:
1. Landlord clicks "Preview & Sign Lease"
2. Full lease opens in popup modal
3. Landlord reads and scrolls through
4. At bottom: consent checkbox + signature pad
5. After signing, shows "Send to Tenant" button
6. Tenant email prompt, then sends

#### Step 4: Update SALeaseWizard

**Modify:** `src/components/lease/SALeaseWizard.tsx`

Add state for:
- `showLeasePreview: boolean`
- `landlordHasSigned: boolean`

Update flow to:
1. Step 10 triggers preview modal
2. Modal handles signing
3. After landlord signs, enable "Send to Tenant"
4. Save signature data to contract

#### Step 5: Create Tenant View Lease Page

**Modify:** `src/pages/LeaseSignature.tsx`

Replace the current separate page approach with:
1. When tenant opens link, immediately show `LeasePreviewModal`
2. Tenant reads the full lease in the popup
3. Tenant signs at the bottom
4. After both signed, trigger PDF generation with signatures

#### Step 6: Update PDF Generation Edge Function

**Modify:** `supabase/functions/generate-lease-pdf/index.ts`

Add signature embedding:
- Accept landlord and tenant signature image URLs
- Embed signature images into the PDF at the signature sections
- Only generate final PDF after both parties have signed
- Include timestamp of each signature on the document

---

### Component Structure

```
LeasePreviewModal
├── DialogContent (max-w-5xl, max-h-[90vh])
│   ├── DialogHeader
│   │   ├── Title: "Lease Agreement"
│   │   └── Subtitle: Property address + status
│   │
│   ├── ScrollArea (flex-1, full lease content)
│   │   ├── Rendered Lease HTML (with proper styling)
│   │   ├── Annexure A (Condition Report)
│   │   └── Signature Section
│   │       ├── Landlord Signature (show if signed, or pad if current user)
│   │       └── Tenant Signature (show if signed, or pad if current user)
│   │
│   └── Footer (sticky)
│       ├── Consent checkbox
│       ├── Sign button
│       └── Download PDF (if fully signed)
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/lease/LeasePreviewModal.tsx` | Main popup component with lease display + signing |
| `src/utils/leaseHtmlRenderer.ts` | Convert template text to styled HTML |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/lease/steps-sa/Step10ReviewGenerate.tsx` | Replace buttons, add preview modal trigger |
| `src/components/lease/SALeaseWizard.tsx` | Add preview state and modal |
| `src/pages/LeaseSignature.tsx` | Use LeasePreviewModal instead of current layout |
| `src/hooks/useLeaseContracts.ts` | Add method to save signature data |
| `supabase/functions/generate-lease-pdf/index.ts` | Embed signature images in final PDF |

---

### CSS Fixes for Text Overflow

The lease preview will use these CSS properties to prevent text running off:

```css
.lease-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
  line-height: 1.6;
  font-size: 14px;
}

.lease-section-header {
  font-weight: bold;
  margin-top: 24px;
  margin-bottom: 12px;
  page-break-after: avoid;
}

.lease-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}
```

---

### User Experience Details

**For Landlord:**
1. Complete 10 wizard steps
2. Click "Preview & Sign Lease"
3. Large popup shows full lease
4. Scroll through reading the document
5. At bottom: checkbox + signature pad
6. Sign, then prompted to send to tenant
7. Success dialog shows "Lease sent to tenant for signature"

**For Tenant:**
1. Receives email with link
2. Clicks "View Lease"
3. Same large popup shows full lease (with landlord signature visible)
4. Scroll through reading
5. At bottom: checkbox + signature pad (landlord sig shown above)
6. Sign
7. Success dialog: "Lease complete! Both parties signed"
8. PDF automatically generated with both signatures embedded

---

### Signing Section Layout

```
┌──────────────────────────────────────────────────┐
│ SIGNATURES                                       │
├──────────────────────────────────────────────────┤
│                                                  │
│ LANDLORD                                         │
│ ┌──────────────────────────────────────────────┐ │
│ │  [Signature Image or Canvas]                 │ │
│ └──────────────────────────────────────────────┘ │
│ Name: John Smith                                 │
│ Signed: 27 January 2026 at 14:30                │
│                                                  │
│ ─────────────────────────────────────────────── │
│                                                  │
│ TENANT                                           │
│ ┌──────────────────────────────────────────────┐ │
│ │  [Signature Image or Canvas]                 │ │
│ └──────────────────────────────────────────────┘ │
│ Name: Jane Doe                                   │
│ Signed: 27 January 2026 at 15:45                │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

### Implementation Order

1. **Create LeaseHtmlRenderer utility** - Parse template text into styled HTML
2. **Create LeasePreviewModal** - Full popup with scroll, lease content, signatures
3. **Update Step10** - Add "Preview & Sign" button, integrate modal
4. **Update SALeaseWizard** - Add state and handlers for signing flow
5. **Update LeaseSignature page** - Use same modal for tenant viewing
6. **Update PDF generation** - Embed signature images in final document

---

### PDF Only After Both Sign

The key change is:
- **Before**: PDF generated first, then signed separately
- **After**: Lease displayed as HTML, signatures captured, PDF generated only when both parties have signed

This means:
- Draft leases are HTML-only (in the popup)
- Final signed leases become PDFs with embedded signatures
- The PDF becomes the legal record with both signatures visible

