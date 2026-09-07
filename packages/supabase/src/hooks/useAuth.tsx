/// <reference types="vite/client" />
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../client';

// The generated Database types mis-resolve public.user_roles (the query builder
// collapses to SelectQueryError and rejects its own columns), so this one table
// is read/written through an untyped view of the same client. Runtime columns:
// user_id (uuid), role (text). All other tables and auth calls stay fully typed.
const untypedClient = supabase as unknown as SupabaseClient;

// Cross-account-safe localStorage keys preserved across sign-out (theme, cookie
// consent, language). Everything else is cleared so the next account never sees
// the previous user's cached data.
const PRESERVED_ON_SIGNOUT = /theme|cookie|consent|lang|i18n/i;

// Shape shared by supabase AuthError, PostgrestError, and our synthetic errors —
// consumers only ever read `.message`.
interface AuthActionError {
  message?: string;
  status?: number;
  code?: string;
}

type AuthResult = { error: AuthActionError | null };

// Minimal typing for the optional Capacitor native bridge injected at runtime.
interface CapacitorListenerHandle {
  remove?: () => void;
}
interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: {
    App?: {
      addListener?: (
        event: string,
        cb: (data: { url: string }) => void,
      ) => CapacitorListenerHandle | Promise<CapacitorListenerHandle>;
      getInfo?: () => Promise<{ id?: string }>;
    };
    Browser?: {
      open?: (options: { url: string }) => Promise<void>;
      close?: () => Promise<void>;
    };
  };
}

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // true until auth AND roles are resolved
  authLoading: boolean;
  rolesLoading: boolean;
  signUp: (email: string, password: string, role?: 'tenant' | 'landlord') => Promise<{ error: AuthActionError | null; isNewUser?: boolean }>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (role?: 'tenant' | 'landlord') => Promise<AuthResult>;
  signInWithApple: (role?: 'tenant' | 'landlord') => Promise<AuthResult>;
  signInWithProvider: (provider: 'google' | 'apple' | 'facebook', role?: 'tenant' | 'landlord') => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  isLandlord: boolean;
  isAdmin: boolean;
  redirectAfterAuth: (path: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isLandlord, setIsLandlord] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Native OAuth return: the provider redirects to our custom-scheme deep link
    // (e.g. com.mzanzihomes.landlord://login-callback?code=…). Catch it, exchange
    // the code for a session (PKCE verifier is in storage from signInWithOAuth),
    // and close the in-app browser. Web uses detectSessionInUrl instead.
    let removeUrlListener: (() => void) | undefined;
    // Guard every hop: on a build where @capacitor/app isn't present,
    // cap.Plugins.App is undefined — never let that crash app startup.
    try {
      const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
      const appPlugin = cap?.Plugins?.App;
      if (cap?.isNativePlatform?.() && appPlugin?.addListener) {
        const registration = appPlugin.addListener('appUrlOpen', async ({ url }: { url: string }) => {
          if (!url || !url.includes('login-callback')) return;
          try {
            const code = new URL(url).searchParams.get('code');
            if (code) await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.warn('OAuth code exchange failed:', e);
          } finally {
            try { await cap?.Plugins?.Browser?.close?.(); } catch {}
          }
        });
        Promise.resolve(registration).then((handle: CapacitorListenerHandle) => {
          removeUrlListener = () => { try { handle?.remove?.(); } catch {} };
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Native OAuth listener setup skipped:', e);
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (import.meta.env.DEV) console.log('Auth state changed:', event, session?.user?.email_confirmed_at);

        // If user is not verified, sign them out
        if (session?.user && !session.user.email_confirmed_at) {
          if (import.meta.env.DEV) console.log('User not verified, signing out');
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setAuthLoading(false);
          setIsLandlord(false);
          setIsAdmin(false);
          setRolesLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);

        // Check user role
        if (session?.user) {
          setRolesLoading(true);
          checkUserRole(session.user.id, session.user.created_at);
        } else {
          setIsLandlord(false);
          setIsAdmin(false);
          setRolesLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (import.meta.env.DEV) console.log('Initial session check:', session?.user?.email_confirmed_at);

      // If user is not verified, clear session
      if (session?.user && !session.user.email_confirmed_at) {
        if (import.meta.env.DEV) console.log('Initial session not verified, clearing');
        supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setAuthLoading(false);
        setRolesLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (session?.user) {
        setRolesLoading(true);
        checkUserRole(session.user.id, session.user.created_at);
      } else {
        setRolesLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (removeUrlListener) removeUrlListener();
    };
  }, []);

  const checkUserRole = async (userId: string, createdAt?: string) => {
    // Whether we already have known-good roles cached from a previous online
    // session. If a role fetch fails (e.g. the device is offline), we must NOT
    // clobber these with `false` — doing so wrongly boots a landlord to the
    // "Wrong App" screen the moment they lose connectivity.
    let hadCache = false;
    try {
      // Fast hydration from localStorage
      const cached = localStorage.getItem(`sr_roles_${userId}`);
      if (cached) {
        try {
          const parsed: unknown = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            if ('isLandlord' in parsed && typeof parsed.isLandlord === 'boolean') setIsLandlord(parsed.isLandlord);
            if ('isAdmin' in parsed && typeof parsed.isAdmin === 'boolean') setIsAdmin(parsed.isAdmin);
            hadCache =
              ('isLandlord' in parsed && typeof parsed.isLandlord === 'boolean') ||
              ('isAdmin' in parsed && typeof parsed.isAdmin === 'boolean');
          }
        } catch {}
      }

      // Simple role fetch without retries to avoid loops
      const { data: roles, error } = await untypedClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.warn('Could not fetch user roles:', error.message);
        // Offline / transient failure — keep the cached roles. Only fall back to
        // defaults when we have nothing cached to trust.
        if (!hadCache) {
          setIsLandlord(false);
          setIsAdmin(false);
        }
        setRolesLoading(false);
        return;
      }

      let userRoles = roles?.map((r) => r.role) || [];

      // Role assignment is server-authoritative. The DB trigger writes the default
      // 'tenant' role on signup; the client never writes user_roles directly (RLS
      // forbids it anyway). The one self-service elevation — tenant → landlord — goes
      // through the SECURITY DEFINER promote_to_landlord() RPC (authenticated-only).
      // The chosen role is stashed in sessionStorage before the OAuth redirect; apply
      // it only for a brand-new signup that isn't already a landlord.
      const pendingRole = sessionStorage.getItem('pendingOAuthRole');
      if (pendingRole === 'landlord' || pendingRole === 'tenant') {
        sessionStorage.removeItem('pendingOAuthRole');
        const isFreshSignup = !!createdAt && (Date.now() - new Date(createdAt).getTime()) < 2 * 60 * 1000;
        if (isFreshSignup && pendingRole === 'landlord' && !userRoles.includes('landlord')) {
          const { error: promoteError } = await supabase.rpc('promote_to_landlord');
          if (!promoteError) userRoles = [...userRoles, 'landlord'];
        }
      }

      setIsLandlord(userRoles.includes('landlord'));
      setIsAdmin(userRoles.includes('admin'));

      // Cache roles
      localStorage.setItem(`sr_roles_${userId}`, JSON.stringify({
        isLandlord: userRoles.includes('landlord'),
        isAdmin: userRoles.includes('admin'),
      }));
    } catch (error) {
      console.warn('Role check failed:', error);
      // Same rule as above: never downgrade a cached landlord/admin to false on
      // a failed (likely offline) check.
      if (!hadCache) {
        setIsLandlord(false);
        setIsAdmin(false);
      }
    } finally {
      setRolesLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: 'tenant' | 'landlord' = 'tenant',
  ): Promise<{ error: AuthActionError | null; isNewUser?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      return { error, isNewUser: false };
    }

    if (data.user && !data.user.email_confirmed_at) {
      // User created but email not verified — profile/role are created by
      // database triggers on auth.users insert, so no manual inserts needed here.
      // Attempting them now would 401 (no session yet) and 409 (trigger already ran).
      return { error: null, isNewUser: true };
    }

    // If email is already confirmed (unlikely with new signup)
    return { error: null, isNewUser: false };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return {
        error: {
          message: 'Please verify your email before signing in. Check your inbox for the verification link.',
        },
      };
    }

    return { error: null };
  };

  const signInWithProvider = async (
    provider: 'google' | 'apple' | 'facebook',
    role: 'tenant' | 'landlord' = 'tenant',
  ): Promise<AuthResult> => {
    // Apple/Google don't round-trip our own params back through the OAuth redirect,
    // so the chosen role is stashed here and applied in checkUserRole if this turns
    // out to be a brand-new signup with no role yet. The app webview stays alive
    // while the system browser handles OAuth, so this survives the round-trip.
    sessionStorage.setItem('pendingOAuthRole', role);

    const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
    // Only take the native path if the Browser plugin is actually present;
    // otherwise fall through to the web flow rather than throwing.
    const canNative = !!cap?.isNativePlatform?.() && !!cap?.Plugins?.Browser?.open;

    if (canNative) {
      // Native flow: redirect back into the app via a custom-scheme deep link
      // (the app's bundle id), open the provider in an in-app browser, and let
      // the appUrlOpen listener (below) exchange the returned code for a session.
      let bundleId = 'app';
      try { bundleId = (await cap?.Plugins?.App?.getInfo?.())?.id || bundleId; } catch {}
      const redirectTo = `${bundleId}://login-callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { role, is_signup: 'true' } },
      });
      if (error) return { error };
      try { await cap?.Plugins?.Browser?.open?.({ url: data.url }); } catch (e) { return { error: { message: e instanceof Error ? e.message : String(e) } }; }
      return { error: null };
    }

    // Web flow
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          role: role,
          is_signup: 'true',
        },
      },
    });
    return { error };
  };

  const signInWithGoogle = async (role: 'tenant' | 'landlord' = 'tenant'): Promise<AuthResult> =>
    signInWithProvider('google', role);
  const signInWithApple = async (role: 'tenant' | 'landlord' = 'tenant'): Promise<AuthResult> =>
    signInWithProvider('apple', role);

  const resetPassword = async (email: string): Promise<AuthResult> => {
    // Use the current domain for password reset to ensure proper routing
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const redirectAfterAuth = (path: string) => {
    if (path) {
      sessionStorage.setItem('returnTo', path);
    } else {
      sessionStorage.removeItem('returnTo');
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first to prevent auto sign-in
      setUser(null);
      setSession(null);
      setIsLandlord(false);
      setIsAdmin(false);
      setAuthLoading(false);
      setRolesLoading(false);

      // Clear ALL cached user data from localStorage so the next account that
      // signs in never briefly sees the previous account's data (messages,
      // conversations, drafts, roles, etc.). Only cross-account-safe keys
      // (theme, cookie consent, language) are preserved.
      try {
        for (const k of Object.keys(localStorage)) {
          if (!PRESERVED_ON_SIGNOUT.test(k)) localStorage.removeItem(k);
        }
      } catch (e) {
        console.warn('Failed to clear cached data on sign out', e);
      }

      // Then sign out from server
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Sign out error:', error);
      }

      // Force redirect to home page
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      // Force redirect to home page
      window.location.href = '/';
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading: authLoading || rolesLoading,
    authLoading,
    rolesLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signInWithProvider,
    resetPassword,
    signOut,
    isLandlord,
    isAdmin,
    redirectAfterAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
