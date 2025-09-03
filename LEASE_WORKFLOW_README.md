# SwiftRent Lease Workflow System

## Overview

This document describes the complete lease workflow system implemented for SwiftRent, which allows landlords and tenants to generate, review, and sign lease agreements without external dependencies like DocuSign.

## Features

### ✅ Completed Features

1. **Database Schema**
   - `leases` table with full state management
   - `lease_signatures` table for signature tracking
   - `lease_audit_logs` table for compliance and audit trails
   - Row Level Security (RLS) policies for data protection

2. **PDF Generation**
   - Server-side PDF generation using pdf-lib
   - Multi-page layout with proper pagination
   - SwiftRent branding and styling
   - Dynamic field population from lease data

3. **In-App Signature System**
   - Draw signature on canvas
   - Type signature with cursive font
   - Upload signature image (PNG/JPEG)
   - Signature validation and storage

4. **State Management**
   - Complete state machine for lease lifecycle
   - Status tracking: DRAFT → PENDING_SIGNATURES → COMPLETED
   - Change request and cancellation workflows

5. **User Interface**
   - Integrated into existing property management tabs
   - Mobile-responsive design
   - Real-time status updates
   - Activity timeline and audit logs

6. **Notifications**
   - Real-time notifications for lease events
   - Toast notifications for status changes
   - Supabase real-time subscriptions

## Database Tables

### leases
```sql
- id (UUID, Primary Key)
- property_id (UUID, Foreign Key)
- landlord_user_id (UUID, Foreign Key)
- tenant_user_id (UUID, Foreign Key, nullable)
- version (INTEGER, default 1)
- status (ENUM: DRAFT, PENDING_TENANT_SIGNATURE, PENDING_LANDLORD_SIGNATURE, COMPLETED, CANCELED, CHANGES_REQUESTED)
- lease_data (JSONB, complete lease information)
- pdf_draft_url (TEXT, nullable)
- pdf_signed_url (TEXT, nullable)
- created_at, updated_at (TIMESTAMPTZ)
```

### lease_signatures
```sql
- id (UUID, Primary Key)
- lease_id (UUID, Foreign Key)
- role (ENUM: TENANT, LANDLORD)
- signer_user_id (UUID, Foreign Key)
- signed_at (TIMESTAMPTZ, nullable)
- signature_image_url (TEXT, nullable)
- signature_hash (TEXT, nullable)
- ip_address (TEXT, nullable)
- user_agent (TEXT, nullable)
- geo_meta (JSONB, nullable)
- created_at (TIMESTAMPTZ)
```

### lease_audit_logs
```sql
- id (UUID, Primary Key)
- lease_id (UUID, Foreign Key)
- actor_user_id (UUID, Foreign Key)
- action (ENUM: GENERATED, VIEWED, DOWNLOADED, SIGNED, REQUESTED_CHANGES, CANCELED, REGENERATED)
- metadata (JSONB, nullable)
- created_at (TIMESTAMPTZ)
```

## API Endpoints

### Supabase Edge Functions

1. **generate-lease-pdf**
   - Generates PDF from lease data
   - Uploads to Supabase Storage
   - Returns public URL

2. **lease-management**
   - `POST /generate` - Create new lease
   - `POST /sign` - Sign lease with signature
   - `POST /request-changes` - Request lease modifications
   - `POST /cancel` - Cancel lease (landlord only)

## Components

### React Components

1. **LeaseManagement** (`src/components/lease/LeaseManagement.tsx`)
   - Main lease management interface
   - Status display and action buttons
   - Activity timeline

2. **SignatureModal** (`src/components/lease/SignatureModal.tsx`)
   - Signature capture interface
   - Multiple signature methods (draw, type, upload)
   - Signature preview and validation

3. **useLease** (`src/hooks/useLease.tsx`)
   - Lease data management hook
   - CRUD operations for leases
   - Signature handling

4. **useLeaseNotifications** (`src/hooks/useLeaseNotifications.tsx`)
   - Real-time notification system
   - Supabase real-time subscriptions
   - Toast notifications

## Lease Data Structure

```typescript
interface LeaseData {
  landlord: {
    name: string;
    id_number: string;
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  tenant: {
    name: string;
    id_number: string;
    email: string;
    phone: string;
    current_address: string;
    occupants: Array<{
      name: string;
      relationship: string;
      age: string;
    }>;
  };
  property: {
    address: string;
    unit: string;
    city: string;
    province: string;
    postal_code: string;
    type: 'apartment' | 'house' | 'townhouse';
    parking: 'N/A' | '1 bay' | '2 bays';
  };
  term: {
    start_date: string;
    end_date: string;
    option_to_renew: boolean;
    notice_period_days: number;
  };
  rent: {
    monthly_rent: number;
    due_day: number;
    payment_method: 'EFT' | 'Cash' | 'Cheque';
    late_fee_policy: {
      grace_days: number;
      late_fee_fixed: number;
      late_fee_percent: number;
    };
  };
  deposit: {
    amount: number;
    return_days: number;
  };
  utilities: {
    water: 'tenant' | 'landlord' | 'included';
    electricity: 'tenant' | 'landlord' | 'included';
    internet: 'tenant' | 'landlord' | 'included';
    other: string;
  };
  maintenance: {
    tenant_minor_repairs_cap: number;
    landlord_responsible: string[];
  };
  access: {
    entry_notice_hours: number;
  };
  governing_law: string;
  attachments: {
    move_in_inspection_required: boolean;
    annexures: string[];
  };
  branding: {
    logo_url: string;
    primary_hex: string;
    secondary_hex: string;
    font_family: string;
  };
}
```

## Workflow States

1. **DRAFT** - Lease generated, awaiting signatures
2. **PENDING_TENANT_SIGNATURE** - Landlord signed, waiting for tenant
3. **PENDING_LANDLORD_SIGNATURE** - Tenant signed, waiting for landlord
4. **COMPLETED** - Both parties have signed
5. **CANCELED** - Lease canceled by landlord
6. **CHANGES_REQUESTED** - One party requested modifications

## Setup Instructions

### 1. Database Setup

Run the SQL script in `create_lease_tables.sql` in your Supabase SQL editor:

```bash
# Copy the contents of create_lease_tables.sql and run in Supabase SQL Editor
```

### 2. Storage Buckets

Create the following storage buckets in Supabase:

```bash
# lease-documents (for PDF files)
# lease-signatures (for signature images)
```

### 3. Edge Functions

Deploy the edge functions:

```bash
npx supabase functions deploy generate-lease-pdf
npx supabase functions deploy lease-management
```

### 4. Environment Variables

Ensure these environment variables are set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### For Landlords

1. Navigate to Property Management → Leases tab
2. Click "Generate Lease" to create a new lease
3. Review and sign the lease
4. Monitor tenant signature status
5. Download completed lease

### For Tenants

1. Receive notification when lease is ready
2. Navigate to Leases tab in tenant dashboard
3. Review lease terms
4. Sign the lease using preferred method
5. Download signed lease

## Security Features

- Row Level Security (RLS) on all tables
- User authentication required for all operations
- Signature validation and hashing
- IP address and user agent logging
- Complete audit trail for compliance

## Compliance

- ECTA-compliant electronic signatures
- Audit logs for all actions
- Signature hash verification
- Document versioning
- IP address tracking

## Future Enhancements

- Email notifications
- Witness signatures
- Initials on each page
- Move-in checklist integration
- Automated rent collection integration
- Document templates customization

## Troubleshooting

### Common Issues

1. **PDF Generation Fails**
   - Check Supabase Storage permissions
   - Verify edge function deployment
   - Check lease data completeness

2. **Signature Upload Issues**
   - Ensure file is PNG/JPEG format
   - Check file size (max 2MB)
   - Verify storage bucket permissions

3. **Real-time Notifications Not Working**
   - Check Supabase real-time settings
   - Verify RLS policies
   - Check user authentication

### Debug Mode

Enable debug logging by setting:

```bash
SUPABASE_DEBUG=true
```

## Support

For technical support or questions about the lease workflow system, please refer to the SwiftRent development team.
