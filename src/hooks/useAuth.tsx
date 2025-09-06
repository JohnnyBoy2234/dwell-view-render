import { createContext, useContext, useEffect, useState } from 'react';
import { User,Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const [isLandlord, setIsLandlord] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [returnToPath, setReturnToPath] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check user role
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setIsLandlord(false);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => {
          checkUserRole(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const userRoles = roles?.map(r => r.role) || [];
      setIsLandlord(userRoles.includes('landlord'));
      setIsAdmin(userRoles.includes('admin'));
    } catch (error) {
      setIsLandlord(false);
      setIsAdmin(false);
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
      // Sign out the user if email is not verified
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
    setReturnToPath(path);
  };

  const signOut = async () => {
    try {
      // Clear local state first to prevent auto sign-in
      setUser(null);
      setSession(null);
      setIsLandlord(false);
      setIsAdmin(false);
      
      // Clear all auth data from localStorage
      localStorage.removeItem('sb-rsfrvjaqxhoqavvscvwf-auth-token');
      localStorage.removeItem('supabase.auth.token');
      
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
    loading,
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