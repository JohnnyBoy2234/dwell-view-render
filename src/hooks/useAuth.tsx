import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError, AuthResponse, SignInWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'tenant' | 'landlord' | 'admin';
type AuthProviderType = 'google' | 'apple' | 'facebook';

interface ApiError {
  message: string;
  status?: number;
  details?: string;
  hint?: string;
  code?: string;
}

interface AuthResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

interface SignUpResult extends AuthResult<{ isNewUser: boolean }> {}
interface SignInResult extends AuthResult<{ user: User; session: Session }> {}
interface ResetPasswordResult extends AuthResult<{}> {}

interface UserProfile {
  user_id: string;
  display_name: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authLoading: boolean;
  rolesLoading: boolean;
  signUp: (email: string, password: string, role?: UserRole) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: (role?: UserRole) => Promise<SignInResult>;
  signInWithApple: (role?: UserRole) => Promise<SignInResult>;
  signInWithProvider: (provider: AuthProviderType, role?: UserRole) => Promise<SignInResult>;
  resetPassword: (email: string) => Promise<ResetPasswordResult>;
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

  const checkUserRole = useCallback(async (userId: string) => {
    const validateCachedRoles = (cached: string | null): { isLandlord: boolean; isAdmin: boolean } | null => {
      if (!cached) return null;
      try {
        const parsed = JSON.parse(cached);
        if (typeof parsed.isLandlord === 'boolean' && typeof parsed.isAdmin === 'boolean') {
          return { isLandlord: parsed.isLandlord, isAdmin: parsed.isAdmin };
        }
      } catch (error) {
        console.warn('Failed to parse cached roles:', error);
      }
      return null;
    };

    try {
      const cached = localStorage.getItem(`sr_roles_${userId}`);
      const cachedRoles = validateCachedRoles(cached);
      
      if (cachedRoles) {
        setIsLandlord(cachedRoles.isLandlord);
        setIsAdmin(cachedRoles.isAdmin);
      }

      // Fetch fresh roles from the database
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(10); // Safety limit
      
      if (error) {
        console.warn('Could not fetch user roles:', error);
        if (!cachedRoles) {
          setIsLandlord(false);
          setIsAdmin(false);
        }
        setRolesLoading(false);
        return;
      }
      
      const userRoles = Array.isArray(roles) 
        ? roles.map(r => r.role).filter((r): r is UserRole => 
            r === 'tenant' || r === 'landlord' || r === 'admin'
          )
        : [];
      
      const hasLandlordRole = userRoles.includes('landlord');
      const hasAdminRole = userRoles.includes('admin');
      
      setIsLandlord(hasLandlordRole);
      setIsAdmin(hasAdminRole);

      // Only cache valid roles
      if (userRoles.length > 0) {
        localStorage.setItem(`sr_roles_${userId}`, JSON.stringify({ 
          isLandlord: hasLandlordRole,
          isAdmin: hasAdminRole
        }));
      }
    } catch (error) {
      console.warn('Role check failed, using defaults:', error);
      setIsLandlord(false);
      setIsAdmin(false);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/\d/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  };

  const signUp = async (
    email: string, 
    password: string, 
    role: UserRole = 'tenant'
  ): Promise<SignUpResult> => {
    // Input validation
    if (!email || !password) {
      return {
        data: null,
        error: { message: 'Email and password are required' }
      };
    }

    if (!validateEmail(email)) {
      return {
        data: null,
        error: { message: 'Please enter a valid email address' }
      };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        data: null,
        error: { message: passwordValidation.message || 'Invalid password' }
      };
    }

    if (!['tenant', 'landlord'].includes(role)) {
      return {
        data: null,
        error: { message: 'Invalid user role' }
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) {
        return {
          data: null,
          error: { message: error.message }
        };
      }

      if (data.user) {
        try {
          // Create user role record
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role
            });
          
          if (roleError) {
            console.error('Error creating user role:', roleError);
            // Continue with signup even if role creation fails
          }
          
          // Create user profile
          const displayName = data.user.email?.split('@')[0] || 'User';
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: data.user.id,
              display_name: displayName,
              email_verified: false
            });

          if (profileError) {
            console.error('Error creating user profile:', profileError);
            // Continue with signup even if profile creation fails
          }
        } catch (error) {
          console.error('Error during user setup:', error);
          // Continue with signup even if there are errors in setup
        }
      }
      
      return {
        data: { isNewUser: true },
        error: null
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        data: null,
        error: { 
          message: error instanceof Error ? error.message : 'An unexpected error occurred during signup'
        }
      };
    }
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    // Input validation
    if (!email || !password) {
      return {
        data: null,
        error: { message: 'Email and password are required' }
      };
    }

    if (!validateEmail(email)) {
      return {
        data: null,
        error: { message: 'Please enter a valid email address' }
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return { 
          data: null,
          error: { 
            message: error.message || 'Invalid login credentials',
            code: error.status?.toString()
          } 
        };
      }

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return { 
          data: null,
          error: { 
            message: 'Please verify your email before signing in. Check your inbox for a verification code.',
            code: 'email_not_verified'
          } 
        };
      }
      
      return { 
        data: { user: data.user, session: data.session! },
        error: null 
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred during sign in',
          code: 'sign_in_error'
        }
      };
    }
  };

  const signInWithProvider = async (
    provider: AuthProviderType, 
    role: UserRole = 'tenant'
  ): Promise<SignInResult> => {
    if (!['google', 'apple', 'facebook'].includes(provider)) {
      return {
        data: null,
        error: { message: 'Unsupported authentication provider' }
      };
    }

    if (!['tenant', 'landlord'].includes(role)) {
      return {
        data: null,
        error: { message: 'Invalid user role' }
      };
    }

    try {
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
      
      if (error) {
        return {
          data: null,
          error: { 
            message: error.message || 'Authentication failed',
            code: error.status?.toString()
          }
        };
      }
      
      // The actual user data will be handled by the auth state change listener
      return { 
        data: null, 
        error: null 
      };
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      return {
        data: null,
        error: { 
          message: error instanceof Error ? error.message : 'An unexpected error occurred during authentication',
          code: 'provider_auth_error'
        }
      };
    }
  };

  const signInWithGoogle = async (role: UserRole = 'tenant'): Promise<SignInResult> => 
    signInWithProvider('google', role);
    
  const signInWithApple = async (role: UserRole = 'tenant'): Promise<SignInResult> => 
    signInWithProvider('apple', role);

  const resetPassword = async (email: string): Promise<ResetPasswordResult> => {
    if (!email || !validateEmail(email)) {
      return {
        data: null,
        error: { message: 'Please enter a valid email address' }
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        return {
          data: null,
          error: { 
            message: error.message || 'Failed to send password reset email',
            code: error.status?.toString()
          }
        };
      }
      
      return { 
        data: {},
        error: null 
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        data: null,
        error: { 
          message: error instanceof Error ? error.message : 'An unexpected error occurred while processing your request'
        }
      };
    }
  };


  const redirectAfterAuth = (path: string): void => {
    try {
      if (path && typeof path === 'string') {
        // Basic path validation
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        sessionStorage.setItem('returnTo', cleanPath);
      } else if (path === null || path === '') {
        sessionStorage.removeItem('returnTo');
      }
    } catch (error) {
      console.warn('Failed to set redirect path:', error);
    }
  };

  const signOut = async (): Promise<void> => {
    // Clear local state first to prevent auto sign-in
    setUser(null);
    setSession(null);
    setIsLandlord(false);
    setIsAdmin(false);
    setAuthLoading(false);
    setRolesLoading(false);
    
    try {
      // Clear all auth data from localStorage
      const clearAuthData = () => {
        try {
          localStorage.removeItem('sb-rsfrvjaqxhoqavvscvwf-auth-token');
          localStorage.removeItem('supabase.auth.token');
          
          // Clear all role-related data
          Object.keys(localStorage)
            .filter(k => k.startsWith('sr_roles_'))
            .forEach(k => {
              try {
                localStorage.removeItem(k);
              } catch (e) {
                console.warn(`Failed to remove ${k} from localStorage:`, e);
              }
            });
        } catch (e) {
          console.warn('Error clearing auth data:', e);
        }
      };
      
      // Clear data in a way that doesn't block the UI
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(clearAuthData, { timeout: 1000 });
      } else {
        setTimeout(clearAuthData, 0);
      }
      
      // Sign out from server with a timeout
      const signOutPromise = supabase.auth.signOut({ scope: 'local' });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timed out')), 5000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise])
        .catch(error => {
          console.warn('Sign out warning:', error);
          // Continue with redirect even if sign out fails
        });
      
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always redirect to home page, even if there were errors
      try {
        // Use window.location.assign for better browser history handling
        window.location.assign('/');
      } catch (e) {
        // Fallback in case of any errors
        window.location.href = '/';
      }
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