// @ts-nocheck
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);

        // Check user role
        if (session?.user) {
          setRolesLoading(true);
          checkUserRole(session.user.id);
        } else {
          setIsLandlord(false);
          setIsAdmin(false);
          setRolesLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);

      if (session?.user) {
        setRolesLoading(true);
        checkUserRole(session.user.id);
      } else {
        setRolesLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
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
      
      const userRoles = roles?.map(r => r.role) || [];
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

    if (data.user) {
      try {
        // Create user role record
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: role
        });
        
        // Create user profile (email_verified will be false until verified)
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          display_name: data.user.email?.split('@')[0] || 'User',
          email_verified: false
        });

      } catch (roleError) {
        console.error('Error creating user role/profile:', roleError);
        // Don't fail signup if role creation fails, but log the error
      }
    }
    
    return { error: null, isNewUser: true };
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
      
      // Clear all auth data from localStorage
      localStorage.removeItem('sb-rsfrvjaqxhoqavvscvwf-auth-token');
      localStorage.removeItem('supabase.auth.token');
      // Clear cached roles
      // Note: we can't know previous user id here reliably, so clear all sr_roles_* keys
      Object.keys(localStorage)
        .filter(k => k.startsWith('sr_roles_'))
        .forEach(k => localStorage.removeItem(k));
      
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