import { resolveSupabaseEnv } from './support/env';

/** Fail fast with actionable guidance if the local stack isn't ready. */
export default async function globalSetup(): Promise<void> {
  const { url, inbucketUrl, serviceKey } = resolveSupabaseEnv();

  await mustReach(`${url}/auth/v1/health`, 'Supabase Auth');
  await mustReach(inbucketUrl, 'Inbucket');

  const res = await fetch(`${url}/auth/v1/admin/users?per_page=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    throw new Error(`Supabase admin API unreachable (${res.status}). Check SUPABASE_SERVICE_ROLE_KEY.`);
  }
}

async function mustReach(target: string, name: string): Promise<void> {
  try {
    const res = await fetch(target);
    if (res.status >= 500) throw new Error(String(res.status));
  } catch {
    throw new Error(`${name} not reachable at ${target}. Start the local stack: npm run supabase start`);
  }
}
