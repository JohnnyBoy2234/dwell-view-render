import { execSync } from 'node:child_process';

export interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceKey: string;
  inbucketUrl: string;
}

let cached: SupabaseEnv | null = null;

/**
 * Resolve local Supabase connection details. Prefers explicit env vars, then
 * falls back to parsing `supabase status -o env` (well-known local keys).
 * Throws with an actionable message when the stack isn't up.
 */
export function resolveSupabaseEnv(): SupabaseEnv {
  if (cached) return cached;

  const status = readStatusEnv();
  const url = process.env.SUPABASE_URL ?? status.API_URL ?? 'http://127.0.0.1:54321';
  const inbucketUrl = process.env.INBUCKET_URL ?? status.INBUCKET_URL ?? 'http://127.0.0.1:54324';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY;

  if (!anonKey || !serviceKey) {
    throw new Error(
      'Could not resolve local Supabase keys. Start the stack with `npm run supabase start`, ' +
        'or set SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  cached = { url, anonKey, serviceKey, inbucketUrl };
  return cached;
}

function readStatusEnv(): Record<string, string> {
  try {
    const out = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return parseEnvLines(out);
  } catch {
    return {};
  }
}

function parseEnvLines(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}
