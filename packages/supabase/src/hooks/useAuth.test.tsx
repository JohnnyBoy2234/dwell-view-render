// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

interface RoleRow { role: string }
interface RolesResult { data: RoleRow[] | null; error: { message: string } | null }
interface WriteResult { error: { message: string } | null }
type WriteRecord = { table: string; value: unknown };

// The whole '../client' module is replaced so the real createClient / env / the
// module-level onAuthStateChange side effect never run. `h` is built inside
// vi.hoisted so it exists before the hoisted vi.mock factory references it.
const h = vi.hoisted(() => {
  let authCb: ((event: string, session: unknown) => unknown) | null = null;

  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => unknown) => {
      authCb = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ data: { url: 'https://oauth.example/go' }, error: null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
  };

  // Configurable results for the user_roles query builder.
  const state: { roles: RolesResult; write: WriteResult } = {
    roles: { data: [], error: null },
    write: { error: null },
  };
  // Records of write operations so tests can assert role-correction behaviour.
  const calls: { update: WriteRecord[]; insert: WriteRecord[] } = { update: [], insert: [] };

  interface QueryBuilder {
    _op: 'select' | 'update' | null;
    select: Mock;
    update: Mock;
    insert: Mock;
    eq: Mock;
    then: (resolve: (value: RolesResult | WriteResult) => unknown, reject: (reason: unknown) => unknown) => Promise<unknown>;
  }

  const from = vi.fn((table: string): QueryBuilder => {
    const b: QueryBuilder = {
      _op: null,
      select: vi.fn(() => { b._op = 'select'; return b; }),
      update: vi.fn((value: unknown) => { b._op = 'update'; calls.update.push({ table, value }); return b; }),
      insert: vi.fn((value: unknown) => { calls.insert.push({ table, value }); return Promise.resolve(state.write); }),
      eq: vi.fn(() => b),
      then: (resolve, reject) =>
        Promise.resolve(b._op === 'select' ? state.roles : state.write).then(resolve, reject),
    };
    return b;
  });

  const rpcCalls: string[] = [];
  const rpc = vi.fn((name: string) => {
    rpcCalls.push(name);
    return Promise.resolve({ data: null, error: null });
  });

  return {
    supabase: { auth, from, rpc },
    auth,
    from,
    rpc,
    state,
    calls,
    rpcCalls,
    emit: (event: string, session: unknown) => authCb?.(event, session),
    resetCalls: () => { calls.update.length = 0; calls.insert.length = 0; rpcCalls.length = 0; },
  };
});

vi.mock('../client', () => ({ supabase: h.supabase }));

import { AuthProvider, useAuth } from './useAuth';

// supabase's real User carries dozens of fields the hook never reads; the tests
// only supply the handful it branches on.
type TestUser = { id: string; email: string; email_confirmed_at: string | null; created_at: string };
type CapWindow = Window & {
  Capacitor?: { isNativePlatform: () => boolean; Plugins: Record<string, unknown> };
};
type SignInResult = { error: unknown; isNewUser?: boolean };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const verifiedUser = (over: Partial<TestUser> = {}): TestUser => ({
  id: 'u1',
  email: 'user@example.com',
  email_confirmed_at: '2020-01-01T00:00:00Z',
  created_at: '2020-01-01T00:00:00Z',
  ...over,
});

/** Render the hook and wait for the mount effect (getSession) to settle. */
async function renderAuth() {
  const utils = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(utils.result.current.loading).toBe(false));
  return utils;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  h.state.roles = { data: [], error: null };
  h.state.write = { error: null };
  h.resetCalls();
  delete (window as CapWindow).Capacitor;
});

afterEach(() => cleanup());

// ── A. signIn ────────────────────────────────────────────────────────────────
describe('signIn', () => {
  it('returns success for valid, verified credentials and does not sign out', async () => {
    h.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: verifiedUser() }, error: null });
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signIn('user@example.com', 'pw'); });

    expect(res).toEqual({ error: null });
    expect(h.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pw' });
    expect(h.auth.signOut).not.toHaveBeenCalled();
  });

  it('surfaces supabase auth errors unchanged', async () => {
    const error = { message: 'Invalid login credentials' };
    h.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error });
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signIn('user@example.com', 'wrong'); });

    expect(res).toEqual({ error });
    expect(h.auth.signOut).not.toHaveBeenCalled();
  });

  it('blocks unverified accounts: signs them out and returns a verify-email error', async () => {
    h.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: verifiedUser({ email_confirmed_at: null }) },
      error: null,
    });
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signIn('user@example.com', 'pw'); });

    expect(h.auth.signOut).toHaveBeenCalled();
    expect(res?.error).toMatchObject({ message: expect.stringMatching(/verify your email/i) });
  });
});

// ── B. signUp ────────────────────────────────────────────────────────────────
describe('signUp', () => {
  it('reports a brand-new unverified user with isNewUser: true', async () => {
    h.auth.signUp.mockResolvedValueOnce({
      data: { user: verifiedUser({ email_confirmed_at: null }) },
      error: null,
    });
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signUp('new@example.com', 'Abcdef1!'); });

    expect(res).toEqual({ error: null, isNewUser: true });
  });

  it('returns the error and isNewUser: false when supabase rejects the signup', async () => {
    const error = { message: 'User already registered' };
    h.auth.signUp.mockResolvedValueOnce({ data: { user: null }, error });
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signUp('dupe@example.com', 'Abcdef1!'); });

    expect(res).toEqual({ error, isNewUser: false });
  });

  it('forwards the chosen role into user_metadata (defaulting to tenant)', async () => {
    h.auth.signUp.mockResolvedValue({ data: { user: verifiedUser({ email_confirmed_at: null }) }, error: null });
    const { result } = await renderAuth();

    await act(async () => { await result.current.signUp('a@example.com', 'Abcdef1!', 'landlord'); });
    expect(h.auth.signUp).toHaveBeenLastCalledWith(
      expect.objectContaining({
        email: 'a@example.com',
        password: 'Abcdef1!',
        options: expect.objectContaining({ data: { role: 'landlord' } }),
      }),
    );

    await act(async () => { await result.current.signUp('b@example.com', 'Abcdef1!'); });
    expect(h.auth.signUp).toHaveBeenLastCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ data: { role: 'tenant' } }) }),
    );
  });

  it('treats an already-confirmed signup as an existing user (no verification step)', async () => {
    h.auth.signUp.mockResolvedValueOnce({ data: { user: verifiedUser() }, error: null });
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signUp('confirmed@example.com', 'Abcdef1!'); });

    expect(res).toEqual({ error: null, isNewUser: false });
  });
});

// ── C. Email-verification gate in the auth listener ───────────────────────────
describe('email-verification gate', () => {
  it('signs out and clears state when an unverified session arrives via onAuthStateChange', async () => {
    const { result } = await renderAuth();

    await act(async () => {
      await h.emit('SIGNED_IN', { user: verifiedUser({ email_confirmed_at: null }) });
    });

    expect(h.auth.signOut).toHaveBeenCalled();
    await waitFor(() => expect(result.current.user).toBeNull());
    expect(result.current.isLandlord).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('clears an unverified session found during the initial getSession check', async () => {
    h.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: verifiedUser({ email_confirmed_at: null }) } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(h.auth.signOut).toHaveBeenCalled());
    expect(result.current.user).toBeNull();
  });

  it('accepts a verified session and kicks off a role lookup', async () => {
    h.state.roles = { data: [{ role: 'tenant' }], error: null };
    const { result } = await renderAuth();

    await act(async () => { await h.emit('SIGNED_IN', { user: verifiedUser() }); });

    await waitFor(() => expect(result.current.user?.id).toBe('u1'));
    expect(h.from).toHaveBeenCalledWith('user_roles');
  });
});

// ── D. Role resolution + OAuth role correction ────────────────────────────────
describe('checkUserRole', () => {
  it('maps fetched roles onto isLandlord / isAdmin', async () => {
    const { result } = await renderAuth();

    h.state.roles = { data: [{ role: 'landlord' }], error: null };
    await act(async () => { await h.emit('SIGNED_IN', { user: verifiedUser() }); });
    await waitFor(() => expect(result.current.isLandlord).toBe(true));
    expect(result.current.isAdmin).toBe(false);

    h.state.roles = { data: [{ role: 'admin' }], error: null };
    await act(async () => { await h.emit('SIGNED_IN', { user: verifiedUser() }); });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });

  it('falls back to safe defaults when the role fetch errors', async () => {
    h.state.roles = { data: null, error: { message: 'permission denied' } };
    const { result } = await renderAuth();

    await act(async () => { await h.emit('SIGNED_IN', { user: verifiedUser() }); });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLandlord).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('promotes a fresh OAuth landlord signup via the promote_to_landlord RPC', async () => {
    sessionStorage.setItem('pendingOAuthRole', 'landlord');
    h.state.roles = { data: [{ role: 'tenant' }], error: null };
    const { result } = await renderAuth();

    await act(async () => {
      await h.emit('SIGNED_IN', { user: verifiedUser({ created_at: new Date().toISOString() }) });
    });

    await waitFor(() => expect(result.current.isLandlord).toBe(true));
    expect(h.rpcCalls).toContain('promote_to_landlord');
    // Server owns the write — the client never touches user_roles directly.
    expect(h.calls.update).toHaveLength(0);
    expect(h.calls.insert).toHaveLength(0);
    expect(sessionStorage.getItem('pendingOAuthRole')).toBeNull();
  });

  it('promotes via the RPC even when the fresh signup has no roles yet', async () => {
    sessionStorage.setItem('pendingOAuthRole', 'landlord');
    h.state.roles = { data: [], error: null };
    const { result } = await renderAuth();

    await act(async () => {
      await h.emit('SIGNED_IN', { user: verifiedUser({ created_at: new Date().toISOString() }) });
    });

    await waitFor(() => expect(result.current.isLandlord).toBe(true));
    expect(h.rpcCalls).toContain('promote_to_landlord');
    expect(h.calls.insert).toHaveLength(0);
  });

  it('does not touch roles for an established account even if a pending role lingers', async () => {
    sessionStorage.setItem('pendingOAuthRole', 'landlord');
    h.state.roles = { data: [{ role: 'tenant' }], error: null };
    const { result } = await renderAuth();

    const oldCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await act(async () => {
      await h.emit('SIGNED_IN', { user: verifiedUser({ created_at: oldCreatedAt }) });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.calls.update).toHaveLength(0);
    expect(h.calls.insert).toHaveLength(0);
    expect(h.rpcCalls).toHaveLength(0);
    expect(result.current.isLandlord).toBe(false);
    expect(sessionStorage.getItem('pendingOAuthRole')).toBeNull();
  });

  it('makes no correction when there is no pending OAuth role', async () => {
    h.state.roles = { data: [{ role: 'tenant' }], error: null };
    const { result } = await renderAuth();

    await act(async () => {
      await h.emit('SIGNED_IN', { user: verifiedUser({ created_at: new Date().toISOString() }) });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(h.calls.update).toHaveLength(0);
    expect(h.calls.insert).toHaveLength(0);
  });
});

// ── E. OAuth entry points ─────────────────────────────────────────────────────
describe('signInWithProvider', () => {
  it('stashes the role and starts the web OAuth flow with role/is_signup params', async () => {
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signInWithGoogle('landlord'); });

    expect(sessionStorage.getItem('pendingOAuthRole')).toBe('landlord');
    expect(h.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: `${window.location.origin}/`,
          queryParams: { role: 'landlord', is_signup: 'true' },
        }),
      }),
    );
    expect(res).toEqual({ error: null });
  });

  it('signInWithApple delegates to the apple provider with the given role', async () => {
    const { result } = await renderAuth();

    await act(async () => { await result.current.signInWithApple('tenant'); });

    expect(h.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        options: expect.objectContaining({ queryParams: { role: 'tenant', is_signup: 'true' } }),
      }),
    );
  });

  it('falls back to the web flow on native when the Browser plugin is absent', async () => {
    (window as CapWindow).Capacitor = { isNativePlatform: () => true, Plugins: {} };
    const { result } = await renderAuth();

    let res: SignInResult | undefined;
    await act(async () => { res = await result.current.signInWithGoogle('tenant'); });

    // Web redirect, not a custom-scheme deep link — and no throw.
    expect(h.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ redirectTo: `${window.location.origin}/` }),
      }),
    );
    expect(res).toEqual({ error: null });
  });
});

// ── F. resetPassword ──────────────────────────────────────────────────────────
describe('resetPassword', () => {
  it('requests a reset email pointed at /reset-password', async () => {
    const { result } = await renderAuth();

    await act(async () => { await result.current.resetPassword('user@example.com'); });

    expect(h.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });
});
