-- Clear the old screening flags so users can test the new screening flow
UPDATE profiles SET is_tenant_screened = false;