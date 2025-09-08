# Email Verification & KYC Gating Implementation

This document outlines the comprehensive email verification and KYC (Know Your Customer) gating system implemented for SwiftRent to ensure secure viewing requests.

## Overview

The system implements a two-tier verification process before users can request property viewings:

1. **Email Verification**: Users must verify their email address
2. **KYC Approval**: Users must complete identity verification and get admin approval

## Architecture

### Database Tables

- `kyc_profiles`: Stores user KYC status and document paths
- `kyc_audit`: Audit trail for all KYC actions
- `events`: Telemetry data for system monitoring

### Key Functions

- `check_user_gate_status(user_id)`: Returns comprehensive gate status
- `log_event(user_id, name, properties)`: Logs telemetry events
- `is_admin(user_id)`: Checks admin privileges

### Edge Functions

- `kyc-admin-approve`: Admin approval of KYC submissions
- `kyc-admin-decline`: Admin decline of KYC submissions  
- `diagnostics-gates`: Admin diagnostics for user gate status

## Implementation Details

### Frontend Components

#### GatedViewingButton
Primary component that enforces the gating logic:
- Shows different states based on user verification status
- Provides clear messaging and CTAs for each gate condition
- Logs blocked attempts for analytics

#### EmailVerificationGate
Handles email verification flow:
- Resend verification emails
- Manual verification check
- Automatic polling for status updates

#### KYC System
Complete identity verification workflow:
- Document upload (ID + selfie)
- Admin review interface
- Approval/decline with audit trails

### Security Features

#### Server-Side Enforcement
All viewing creation endpoints validate:
```sql
-- Check email verification
SELECT email_confirmed_at FROM auth.users WHERE id = user_id;

-- Check KYC status
SELECT status FROM kyc_profiles WHERE user_id = user_id AND status = 'approved';
```

#### Row Level Security (RLS)
- KYC profiles: Users see own, admins see all
- Audit logs: Users see own, admins see all
- Events: Users see own, admins see all

### Telemetry & Monitoring

#### Event Types
- `kyc_uploaded`: Document upload events
- `kyc_submitted`: Submission for review
- `kyc_approved`: Admin approval
- `kyc_declined`: Admin decline
- `viewing_request_blocked`: Blocked attempts with reason codes
- `viewing_requested`: Successful viewing requests
- `email_verification_resent`: Email resend events

#### Error Codes
- `EMAIL_NOT_VERIFIED`: Email verification required
- `KYC_NOT_APPROVED`: KYC approval required

## Admin Interface

### KYC Management (`/admin/kyc`)
- List all KYC submissions with filtering
- Review documents with secure preview URLs
- Approve/decline with reason tracking
- CSV export functionality

### Diagnostics (`/admin/diagnostics`)
- Real-time gate status checking for any user
- Detailed analysis and troubleshooting
- System health verification

## API Endpoints

### Diagnostics
```
GET /api/diagnostics/gates?userId={uuid}
```

Returns:
```json
{
  "userId": "uuid",
  "emailVerified": true,
  "kycStatus": "approved", 
  "canRequestViewing": true,
  "notes": ["All requirements met"]
}
```

## Testing

### Automated Tests
The system includes automated test cases:

1. **Email Verification Gate**: Validates unverified users are blocked
2. **KYC Status Check**: Tests KYC validation logic  
3. **Events Logging**: Verifies telemetry system
4. **Admin Diagnostics**: Tests admin diagnostic endpoints
5. **Database Policies**: Validates RLS configuration

Run tests via the admin interface at `/admin/tests`.

### Test Data Setup

Create test users with different verification states:
```sql
-- Unverified user
INSERT INTO auth.users (email, email_confirmed_at) VALUES ('test@example.com', NULL);

-- Verified but no KYC
INSERT INTO auth.users (email, email_confirmed_at) VALUES ('verified@example.com', NOW());

-- Fully verified
INSERT INTO auth.users (email, email_confirmed_at) VALUES ('approved@example.com', NOW());
INSERT INTO kyc_profiles (user_id, status) VALUES ('user-id', 'approved');
```

## Security Considerations

### Document Privacy
- Original documents are deleted after approval
- Only metadata retained in audit logs
- Signed URLs expire in 60 seconds

### Access Control
- All KYC admin functions require admin role verification
- Storage policies prevent unauthorized document access
- RLS policies ensure data isolation

### Audit Trail
- Complete audit log for all KYC actions
- Immutable event logging
- Admin action tracking

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Storage bucket policies configured
- [ ] Admin users created with proper roles
- [ ] Test users created for validation
- [ ] Monitoring and alerts configured

## Troubleshooting

### Common Issues

1. **Users can't see KYC panel**
   - Check RLS policies on kyc_profiles table
   - Verify user authentication

2. **Admin functions failing**
   - Verify admin role assignment in user_roles table
   - Check is_admin() function

3. **Document previews not loading**
   - Check storage bucket policies
   - Verify signed URL generation

4. **Gate status incorrect**
   - Run diagnostics endpoint
   - Check check_user_gate_status function

### Debug Commands

```sql
-- Check user gate status
SELECT * FROM check_user_gate_status('user-id');

-- View recent events
SELECT * FROM events WHERE name LIKE 'kyc_%' ORDER BY created_at DESC LIMIT 10;

-- Check admin roles  
SELECT * FROM user_roles WHERE role = 'admin';
```

## Performance Monitoring

Monitor key metrics:
- Gate check response times
- Document upload success rates
- Admin review completion times
- False positive/negative rates

The system is designed to be secure, auditable, and user-friendly while maintaining strict verification requirements for platform safety.