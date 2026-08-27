-- Direct-to-APNs push (iOS delivered straight to Apple, not via FCM) needs the
-- app's bundle id per token to use as the APNs "topic". Landlord and tenant
-- write into the same push_tokens table, so each token records which app it is.
-- Android/FCM ignores this column.
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS app_id TEXT;
