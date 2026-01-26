

# South African Residential Lease Generator - Complete Rebuild Plan

## Overview

This plan replaces the existing lease/contract builder system with a new legally-compliant South African residential lease generator. The new system uses a master lease template with variable placeholders (`{{VARIABLE_NAME}}`) and conditional blocks (`[[IF CONDITION]]...[[ENDIF]]`) to generate non-editable, legally consistent lease documents.

---

## What Gets Deleted (Old System)

The following files will be **completely removed** and replaced:

### Components (6 files)
- `src/components/lease/ContractBuilder.tsx` (592 lines)
- `src/components/lease/steps/ContractBasicInfo.tsx`
- `src/components/lease/steps/ContractParties.tsx`
- `src/components/lease/steps/ContractBankDetails.tsx`
- `src/components/lease/steps/ContractTerms.tsx`
- `src/components/lease/steps/ContractClauses.tsx`
- `src/components/lease/steps/ContractReview.tsx`

### Edge Function
- `supabase/functions/generate-lease-pdf/index.ts` (1029 lines) - will be completely rewritten

### Types
- `src/types/lease.ts` - will be completely rewritten with new structure

---

## New System Architecture

### 10-Step Wizard Flow

```text
+-------+    +--------+    +----------+    +---------+    +-----+
| Step1 | -> | Step2  | -> |  Step3   | -> | Step4   | -> |Step5|
| Lease |    | Parties|    | Property |    | Deposit |    | CPA |
| Basics|    |        |    | Details  |    | & Fees  |    |     |
+-------+    +--------+    +----------+    +---------+    +-----+
    |            |              |              |              |
    v            v              v              v              v
+-------+    +--------+    +----------+    +---------+    +-------+
| Step6 | -> | Step7  | -> |  Step8   | -> | Step9   | -> |Step10 |
|Features| -> |Maintain| -> |Condition | -> |Exclusion| -> |Review |
|Toggles|    |Allocate|    |  Report  |    |   s     |    |Generate|
+-------+    +--------+    +----------+    +---------+    +-------+
```

---

## New Data Types

### Primary Types (`src/types/lease.ts`)

```typescript
// Lease type options
type LeaseType = 'fixed' | 'month_to_month';

// Who maintains which feature
type MaintenanceResponsibility = 'tenant' | 'landlord';

// Condition report answer
type ConditionAnswer = 'yes' | 'no' | 'na';

// Main wizard data structure - all variables for the template
interface LeaseWizardData {
  // STEP 1: Lease Basics
  leaseType: LeaseType;
  leaseStartDate: string;
  leaseEndDate?: string; // Only if fixed-term
  rentAmount: number;
  rentDueDay: number; // 1-7
  escalationPercent?: number;

  // STEP 2: Parties
  landlordFullName: string;
  landlordIdNumber: string;
  landlordAddress: string;
  landlordEmail: string;
  landlordPhone?: string;
  
  tenantFullName: string;
  tenantIdNumber: string;
  tenantAddress: string;
  tenantEmail: string;
  tenantPhone?: string;
  tenantIsJuristic: boolean;

  // STEP 3: Property Details
  propertyAddress: string;
  isSectionalTitle: boolean;
  bodyCorpRulesApply: boolean;

  // STEP 4: Deposit & Fees
  depositAmount: number;
  depositInterestApplies: boolean;
  lateFeeAmount: number;

  // STEP 5: CPA (Auto-calculated)
  tenantIsIndividual: boolean;
  landlordActingInBusiness: boolean;
  cpaApplies: boolean; // Computed field

  // STEP 6: Property Features (Clause Toggles)
  hasPool: boolean;
  hasGarden: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  hasAlarmSecurity: boolean;

  // STEP 7: Maintenance Allocation
  poolMaintenanceBy?: MaintenanceResponsibility;
  gardenMaintenanceBy?: MaintenanceResponsibility;
  alarmMaintenanceBy?: MaintenanceResponsibility;

  // STEP 8: Condition Report (Annexure A)
  conditionReport: ConditionReportAnswers;

  // STEP 9: Exclusions
  excludedItemsList: string;

  // Bank Details (for schedule)
  landlordBankName: string;
  landlordBranchCode: string;
  landlordAccountNumber: string;
  landlordReference?: string;

  // Occupants
  occupantsList?: string;
}

interface ConditionReportAnswers {
  s1_electrical: ConditionAnswer;
  s2_illegalElectrical: ConditionAnswer;
  s3_geyser: ConditionAnswer;
  s4_drainage: ConditionAnswer;
  s5_leakingTaps: ConditionAnswer;
  s6_missingKeys: ConditionAnswer;
  s7_remoteControls: ConditionAnswer;
  s8_alarmSecurity: ConditionAnswer;
  s9_pool: ConditionAnswer;
  s10_poolRepairs: ConditionAnswer;
  s11_braaiFireplace: ConditionAnswer;
  s12_blindsCurtains: ConditionAnswer;
  s13_dampProblems: ConditionAnswer;
  s14_roofLeaks: ConditionAnswer;
  s15_crackedWindows: ConditionAnswer;
  s16_bathsBasins: ConditionAnswer;
  s17_floorTiles: ConditionAnswer;
  s18_structuralDefects: ConditionAnswer;
  s19_carpets: ConditionAnswer;
  s20_builtInCupboards: ConditionAnswer;
  s21_doorHandles: ConditionAnswer;
  s22_boundaryFence: ConditionAnswer;
  s23_buildingRestrictions: ConditionAnswer;
  s24_buildingPlans: ConditionAnswer;
  s25_approvedPlans: ConditionAnswer;
  s26_otherDefects: ConditionAnswer;
  s27_yearsResided: string;
  s28_existingLease: ConditionAnswer;
  s29_limitedKnowledge: ConditionAnswer;
  comments: string; // For any "YES" answers
}

// Contract status stays similar
type LeaseStatus = 'draft' | 'pending_tenant' | 'pending_landlord' | 'signed' | 'expired' | 'terminated';

interface LeaseContract {
  id: string;
  propertyId?: string;
  landlordId: string;
  tenantId?: string;
  title: string;
  wizardData: LeaseWizardData;
  status: LeaseStatus;
  version: number;
  pdfUrl?: string;
  annexurePdfUrl?: string;
  pdfHash?: string;
  landlordSignedAt?: string;
  tenantSignedAt?: string;
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}
```

---

## New Components Structure

### Main Wizard Component
**File:** `src/components/lease/SALeaseWizard.tsx`

Features:
- 10-step progress indicator (mobile-first)
- Auto-save on each step
- Validation before proceeding
- Scroll-to-top on step change
- Plain-language questions with legal tooltips

### Step Components (10 new files)

| Step | File | Variables Collected |
|------|------|---------------------|
| 1 | `Step01LeaseBasics.tsx` | `leaseType`, `leaseStartDate`, `leaseEndDate`, `rentAmount`, `rentDueDay`, `escalationPercent` |
| 2 | `Step02Parties.tsx` | `landlordFullName`, `landlordIdNumber`, `tenantFullName`, `tenantIdNumber`, `tenantIsJuristic` |
| 3 | `Step03PropertyDetails.tsx` | `propertyAddress`, `isSectionalTitle`, `bodyCorpRulesApply` |
| 4 | `Step04DepositFees.tsx` | `depositAmount`, `depositInterestApplies`, `lateFeeAmount` |
| 5 | `Step05CPA.tsx` | `tenantIsIndividual`, `landlordActingInBusiness` (auto-computes `cpaApplies`) |
| 6 | `Step06PropertyFeatures.tsx` | `hasPool`, `hasGarden`, `petsAllowed`, `smokingAllowed`, `hasAlarmSecurity` |
| 7 | `Step07Maintenance.tsx` | `poolMaintenanceBy`, `gardenMaintenanceBy` (only shown if feature exists) |
| 8 | `Step08ConditionReport.tsx` | All 29 condition statements (YES/NO/N/A) |
| 9 | `Step09Exclusions.tsx` | `excludedItemsList` |
| 10 | `Step10ReviewGenerate.tsx` | Read-only preview, generate buttons |

---

## Template Engine

### New Utility: `src/utils/leaseTemplateEngine.ts`

```typescript
/**
 * Processes the master lease template by:
 * 1. Replacing {{VARIABLE_NAME}} placeholders with actual values
 * 2. Evaluating [[IF CONDITION]]...[[ENDIF]] blocks
 * 3. Removing false conditional blocks entirely
 */
export function processLeaseTemplate(
  template: string,
  data: LeaseWizardData
): string;

/**
 * Maps wizard data to template variables
 */
export function buildTemplateVariables(
  data: LeaseWizardData
): Record<string, string>;

/**
 * Evaluates conditions based on wizard data
 * Supports: CPA_APPLIES, TENANT_IS_JURISTIC, IS_SECTIONAL_TITLE,
 * HAS_POOL, HAS_GARDEN, PETS_ALLOWED, SMOKING_ALLOWED, HAS_ALARM_SECURITY
 */
export function evaluateCondition(
  condition: string,
  data: LeaseWizardData
): boolean;
```

### Master Templates Storage

**Store templates as constants:**
- `src/templates/masterLeaseTemplate.ts` - Full legal text with placeholders
- `src/templates/conditionReportTemplate.ts` - Annexure A template

---

## PDF Generation (Edge Function Rewrite)

### File: `supabase/functions/generate-lease-pdf/index.ts`

Complete rewrite with:

1. **Template Processing**
   - Load master template
   - Process all `{{VARIABLE}}` placeholders
   - Evaluate all `[[IF]]...[[ENDIF]]` conditionals
   - Remove empty conditional blocks

2. **Two PDFs Generated**
   - Main Lease Agreement PDF
   - Annexure A: Condition Report PDF

3. **Compliance Features**
   - Timestamp on every page
   - Version number in footer
   - Document hash for integrity
   - Audit trail entry

4. **Non-Editable Output**
   - Locked PDF (read-only)
   - No form fields
   - Watermark option for drafts

---

## Variable Mapping Reference

| Template Variable | Wizard Field | Step |
|-------------------|--------------|------|
| `{{LEASE_TYPE}}` | `leaseType` | 1 |
| `{{LEASE_START_DATE}}` | `leaseStartDate` | 1 |
| `{{LEASE_END_DATE}}` | `leaseEndDate` | 1 |
| `{{RENT_AMOUNT}}` | `rentAmount` (formatted as R X,XXX.XX) | 1 |
| `{{RENT_DUE_DAY}}` | `rentDueDay` | 1 |
| `{{ESCALATION_PERCENT}}` | `escalationPercent` | 1 |
| `{{LANDLORD_FULL_NAME}}` | `landlordFullName` | 2 |
| `{{TENANT_FULL_NAME}}` | `tenantFullName` | 2 |
| `{{PROPERTY_ADDRESS}}` | `propertyAddress` | 3 |
| `{{DEPOSIT_AMOUNT}}` | `depositAmount` | 4 |
| `{{LATE_FEE_AMOUNT}}` | `lateFeeAmount` | 4 |
| `{{EXCLUDED_ITEMS_LIST}}` | `excludedItemsList` | 9 |
| `{{CLAUSE_32_COMMENTS}}` | `conditionReport.comments` | 8 |

---

## Condition Mapping Reference

| Template Condition | Wizard Field | Logic |
|--------------------|--------------|-------|
| `CPA_APPLIES` | `cpaApplies` | `tenantIsIndividual && landlordActingInBusiness` |
| `TENANT_IS_JURISTIC` | `tenantIsJuristic` | Direct boolean |
| `IS_SECTIONAL_TITLE` | `isSectionalTitle` | Direct boolean |
| `HAS_POOL` | `hasPool` | Direct boolean |
| `HAS_GARDEN` | `hasGarden` | Direct boolean |
| `PETS_ALLOWED` | `petsAllowed` | Direct boolean |
| `SMOKING_ALLOWED` | `smokingAllowed` | Direct boolean |
| `HAS_ALARM_SECURITY` | `hasAlarmSecurity` | Direct boolean |

---

## Database Changes

### Migration: Update `lease_contracts` table

```sql
-- Update contract_data column structure
-- Old: LeaseContractData (free-form)
-- New: LeaseWizardData (structured wizard answers)

-- Add annexure PDF URL
ALTER TABLE lease_contracts 
ADD COLUMN IF NOT EXISTS annexure_pdf_url TEXT;

-- Add template version tracking
ALTER TABLE lease_contracts 
ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1;
```

---

## Files to Create (New)

| File | Purpose |
|------|---------|
| `src/components/lease/SALeaseWizard.tsx` | Main 10-step wizard |
| `src/components/lease/steps-sa/Step01LeaseBasics.tsx` | Lease type, dates, rent |
| `src/components/lease/steps-sa/Step02Parties.tsx` | Landlord & tenant details |
| `src/components/lease/steps-sa/Step03PropertyDetails.tsx` | Property address, sectional title |
| `src/components/lease/steps-sa/Step04DepositFees.tsx` | Deposit, late fees |
| `src/components/lease/steps-sa/Step05CPA.tsx` | Consumer Protection Act |
| `src/components/lease/steps-sa/Step06PropertyFeatures.tsx` | Pool, garden, pets toggles |
| `src/components/lease/steps-sa/Step07Maintenance.tsx` | Who maintains what |
| `src/components/lease/steps-sa/Step08ConditionReport.tsx` | 29 condition statements |
| `src/components/lease/steps-sa/Step09Exclusions.tsx` | Excluded items |
| `src/components/lease/steps-sa/Step10ReviewGenerate.tsx` | Preview & generate |
| `src/templates/masterLeaseTemplate.ts` | Legal template text |
| `src/templates/conditionReportTemplate.ts` | Annexure A template |
| `src/utils/leaseTemplateEngine.ts` | Variable/condition processor |
| `src/types/lease.ts` | New types (full rewrite) |

---

## Files to Delete (Old)

| File | Reason |
|------|--------|
| `src/components/lease/steps/ContractBasicInfo.tsx` | Replaced by SA steps |
| `src/components/lease/steps/ContractParties.tsx` | Replaced by SA steps |
| `src/components/lease/steps/ContractBankDetails.tsx` | Replaced by SA steps |
| `src/components/lease/steps/ContractTerms.tsx` | Replaced by SA steps |
| `src/components/lease/steps/ContractClauses.tsx` | Replaced by SA steps |
| `src/components/lease/steps/ContractReview.tsx` | Replaced by SA steps |
| `src/components/lease/ContractBuilder.tsx` | Replaced by SALeaseWizard |

---

## Files to Update

| File | Changes |
|------|---------|
| `src/pages/LeaseBuilder.tsx` | Import SALeaseWizard instead of ContractBuilder |
| `src/hooks/useLeaseContracts.ts` | Update types, add annexure PDF handling |
| `src/components/property/CreateLeaseFromApplication.tsx` | Update data structure |
| `supabase/functions/generate-lease-pdf/index.ts` | Complete rewrite |
| `supabase/functions/send-contract-to-tenant/index.ts` | Add annexure PDF attachment |

---

## UI/UX Design Principles

1. **Mobile-First Layout**
   - Single column on mobile
   - Touch-friendly inputs
   - Large tap targets

2. **Plain Language Questions**
   - No legal jargon in questions
   - Tooltips explain legal implications
   - Examples provided where helpful

3. **Progress Indicator**
   - Shows "Step X of 10"
   - Percentage complete bar
   - Step titles visible

4. **Validation Feedback**
   - Inline errors (red text under fields)
   - Required fields marked with *
   - Cannot proceed until valid

5. **Auto-Save**
   - Save to localStorage on field change
   - Save to database on step completion
   - Resume from last step

---

## Implementation Order

1. **Phase 1: Types & Templates**
   - Create new `src/types/lease.ts`
   - Create `src/templates/masterLeaseTemplate.ts`
   - Create `src/templates/conditionReportTemplate.ts`
   - Create `src/utils/leaseTemplateEngine.ts`

2. **Phase 2: Wizard Steps (1-5)**
   - Step01LeaseBasics
   - Step02Parties
   - Step03PropertyDetails
   - Step04DepositFees
   - Step05CPA

3. **Phase 3: Wizard Steps (6-10)**
   - Step06PropertyFeatures
   - Step07Maintenance
   - Step08ConditionReport
   - Step09Exclusions
   - Step10ReviewGenerate

4. **Phase 4: Main Wizard**
   - Create SALeaseWizard.tsx
   - Update LeaseBuilder.tsx to use it

5. **Phase 5: PDF Generation**
   - Rewrite generate-lease-pdf edge function
   - Test with sample data

6. **Phase 6: Cleanup**
   - Delete old step files
   - Delete old ContractBuilder
   - Update all imports
   - Database migration

---

## Technical Notes

### Why We Cannot Edit Legal Text

The master template contains legally-reviewed clauses. By using only placeholders and conditionals:
- Legal consistency is maintained
- Landlords cannot accidentally create invalid contracts
- Reduces liability for the platform
- Standardizes dispute resolution

### CPA Logic

```typescript
// Consumer Protection Act applies when:
// 1. Tenant is an individual (not juristic person), AND
// 2. Landlord is acting in course of business

const cpaApplies = tenantIsIndividual && landlordActingInBusiness;
```

### Condition Report Dynamic Fields

Only show questions relevant to the property:
- Pool questions (9, 10): Only if `hasPool = true`
- Alarm questions (8): Only if `hasAlarmSecurity = true`

