import { resolveSupabaseEnv } from './env';

export type AppRole = 'tenant' | 'landlord';

export interface CreatedUser {
  id: string;
  email: string;
  password: string;
}

interface CreateUserOptions {
  email: string;
  password: string;
  role: AppRole;
  /** When false, the account stays unconfirmed (for verify-gate tests). */
  confirm: boolean;
}

function adminHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

export async function createUser(options: CreateUserOptions): Promise<CreatedUser> {
  const { url, serviceKey } = resolveSupabaseEnv();
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(serviceKey),
    body: JSON.stringify({
      email: options.email,
      password: options.password,
      email_confirm: options.confirm,
      user_metadata: { role: options.role },
    }),
  });
  if (!res.ok) {
    throw new Error(`admin createUser failed (${res.status}): ${await res.text()}`);
  }
  return { id: parseUserId(await res.json()), email: options.email, password: options.password };
}

export async function deleteUser(id: string): Promise<void> {
  const { url, serviceKey } = resolveSupabaseEnv();
  await fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: adminHeaders(serviceKey) });
}

/** Best-effort sweep of leftover users created by the suite. */
export async function deleteUsersByEmailPrefix(prefix: string): Promise<void> {
  const { url, serviceKey } = resolveSupabaseEnv();
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: adminHeaders(serviceKey) });
  if (!res.ok) return;
  const ids = parseUserIdsByEmailPrefix(await res.json(), prefix);
  await Promise.all(ids.map((id) => deleteUser(id)));
}

function parseUserId(value: unknown): string {
  if (value && typeof value === 'object' && 'id' in value) {
    const { id } = value;
    if (typeof id === 'string') return id;
  }
  throw new Error('admin user response missing string id');
}

function parseUserIdsByEmailPrefix(value: unknown, prefix: string): string[] {
  const users = value && typeof value === 'object' && 'users' in value ? value.users : value;
  if (!Array.isArray(users)) return [];
  const ids: string[] = [];
  for (const entry of users) {
    if (entry && typeof entry === 'object' && 'id' in entry && 'email' in entry) {
      const { id, email } = entry;
      if (typeof id === 'string' && typeof email === 'string' && email.startsWith(prefix)) {
        ids.push(id);
      }
    }
  }
  return ids;
}
