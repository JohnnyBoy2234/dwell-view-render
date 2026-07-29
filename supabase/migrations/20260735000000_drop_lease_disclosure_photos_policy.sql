-- The lease disclosure no longer captures photos (the condition/inspection
-- report is a separate flow). Remove the access policy added in
-- 20260734000000. The bucket itself is empty and left in place — Storage guards
-- direct deletion of bucket rows via SQL; it is inert with no policy granting
-- access.
DROP POLICY IF EXISTS "Owners manage their lease disclosure photos" ON storage.objects;
