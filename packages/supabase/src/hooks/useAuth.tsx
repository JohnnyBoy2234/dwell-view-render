// @ts-nocheck
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // true until auth AND roles are resolved
  authLoading: boolean;
  rolesLoading: boolean;
  signUp: (email: string, password: string, role?: 'tenant' | 'landlord') => Promise<{ error: any; isNewUser?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (role?: 'tenant' | 'landlord') => Promise<{ error: any }>;
  signInWithApple: (role?: 'tenant' | 'landlord') => Promise<{ error: any }>;
  signInWithProvider: (provider: 'google' | 'apple' | 'facebook', role?: 'tenant' | 'landlord') => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isLandlord: boolean;
  isAdmin: boolean;
  redirectAfterAuth: (path: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
      const cap = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
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
        Promise.resolve(registration).then((handle: any) => {
          removeUrlListener = () => { try { handle?.remove?.(); } catch {} };
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Native OAuth listener setup skipped:', e);
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email_confirmed_at);
        
        // If user is not verified, sign them out
        if (session?.user && !session.user.email_confirmed_at) {
          console.log('User not verified, signing out');
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
      console.log('Initial session check:', session?.user?.email_confirmed_at);
      
      // If user is not verified, clear session
      if (session?.user && !session.user.email_confirmed_at) {
        console.log('Initial session not verified, clearing');
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
    try {
      // Fast hydration from localStorage
      const cached = localStorage.getItem(`sr_roles_${userId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (typeof parsed.isLandlord === 'boolean') setIsLandlord(parsed.isLandlord);
          if (typeof parsed.isAdmin === 'boolean') setIsAdmin(parsed.isAdmin);
        } catch {}
      }

      // Simple role fetch without retries to avoid loops
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.warn('Could not fetch user roles:', error.message);
        // Set defaults and continue - don't retry
        setIsLandlord(false);
        setIsAdmin(false);
        setRolesLoading(false);
        return;
      }

      let userRoles = roles?.map(r => r.role) || [];

      // A DB trigger always writes a default 'tenant' role on signup, since Apple/Google
      // don't round-trip our own params back through the OAuth redirect. The role chosen
      // on the sign-in button is stashed in sessionStorage just before the redirect; if
      // this account was created moments ago (a brand-new signup, not a returning user)
      // and only has the trigger's default role, correct it to what was actually chosen.
      const pendingRole = sessionStorage.getItem('pendingOAuthRole');
      if (pendingRole === 'landlord' || pendingRole === 'tenant') {
        sessionStorage.removeItem('pendingOAuthRole');
        const isFreshSignup = !!createdAt && (Date.now() - new Date(createdAt).getTime()) < 2 * 60 * 1000;
        const onlyHasDefaultTenantRole = userRoles.length === 1 && userRoles[0] === 'tenant';

        if (isFreshSignup && onlyHasDefaultTenantRole && pendingRole !== userRoles[0]) {
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ role: pendingRole })
            .eq('user_id', userId)
            .eq('role', 'tenant');
          if (!updateError) {
            userRoles = [pendingRole];
          }
        } else if (isFreshSignup && userRoles.length === 0) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: pendingRole });
          if (!insertError) {
            userRoles = [pendingRole];
          }
        }
      }

      setIsLandlord(userRoles.includes('landlord'));
      setIsAdmin(userRoles.includes('admin'));

      // Cache roles
      localStorage.setItem(`sr_roles_${userId}` , JSON.stringify({
        isLandlord: userRoles.includes('landlord'),
        isAdmin: userRoles.includes('admin')
      }));
    } catch (error) {
      console.warn('Role check failed, using defaults:', error);
      setIsLandlord(false);
      setIsAdmin(false);
    } finally {
      setRolesLoading(false);
    }
  };

  const signUp = async (email: string, password: string, role: 'tenant' | 'landlord' = 'tenant') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth`
      }
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

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { error };
    }

    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      return { 
        error: { 
          message: "Please verify your email before signing in. Check your inbox for a verification code." 
        } 
      };
    }
    
    return { error: null };
  };

  const signInWithProvider = async (provider: 'google' | 'apple' | 'facebook', role: 'tenant' | 'landlord' = 'tenant') => {
    // Apple/Google don't round-trip our own params back through the OAuth redirect,
    // so the chosen role is stashed here and applied in checkUserRole if this turns
    // out to be a brand-new signup with no role yet. The app webview stays alive
    // while the system browser handles OAuth, so this survives the round-trip.
    sessionStorage.setItem('pendingOAuthRole', role);

    const cap = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
    // Only take the native path if the Browser plugin is actually present;
    // otherwise fall through to the web flow rather than throwing.
    const canNative = !!cap?.isNativePlatform?.() && !!cap?.Plugins?.Browser?.open;

    if (canNative) {
      // Native flow: redirect back into the app via a custom-scheme deep link
      // (the app's bundle id), open the provider in an in-app browser, and let
      // the appUrlOpen listener (below) exchange the returned code for a session.
      let bundleId = 'app';
      try { bundleId = (await cap.Plugins?.App?.getInfo?.())?.id || bundleId; } catch {}
      const redirectTo = `${bundleId}://login-callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { role, is_signup: 'true' } },
      });
      if (error) return { error };
      try { await cap.Plugins.Browser.open({ url: data.url }); } catch (e) { return { error: e }; }
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
          is_signup: 'true'
        }
      }
    });
    return { error };
  };

  const signInWithGoogle = async (role: 'tenant' | 'landlord' = 'tenant') => signInWithProvider('google', role);
  const signInWithApple = async (role: 'tenant' | 'landlord' = 'tenant') => signInWithProvider('apple', role);

  const resetPassword = async (email: string) => {
    // Use the current domain for password reset to ensure proper routing
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
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
        const keep = (k: string) => /theme|cookie|consent|lang|i18n/i.test(k);
        Object.keys(localStorage).forEach((k) => {
          if (!keep(k)) localStorage.removeItem(k);
        });
      } catch (e) {
        console.warn('Failed to clear cached data on sign out', e);
      }
      
      // Then sign out from server
      const { error } = await supabase.auth.signOut({ scope: 'local' });
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

  const value = {
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
    redirectAfterAuth
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