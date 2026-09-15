/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Env vars win (web/CI/other projects can override), but fall back to the
// production project so the native (Capacitor) builds work without a .env on
// the build machine. The anon/publishable key is public by design and is
// already baked into the shipped app binary, so this is safe — and it fixed a
// white-screen boot crash where a missing .env made this module throw.
const PROD_SUPABASE_URL = 'https://rsfrvjaqxhoqavvscvwf.supabase.co';
const PROD_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PROD_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || PROD_SUPABASE_ANON_KEY;

const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');

if (import.meta.env.DEV) {
  console.log('[Supabase] Functions URL:', functionsUrl);
}

// Create the Supabase client.
// Options are held in a variable (not an inline literal) so the `functions.url`
// override — which supabase-js accepts at runtime but omits from its option type —
// passes structural assignability without an unchecked cast.
const clientOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    flowType: 'pkce' as const,
  },
  functions: {
    url: functionsUrl,
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, clientOptions);

// Set up auth state change handler
if (typeof window !== 'undefined') {
  // Handle redirects after sign in - only redirect if explicitly requested
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Only redirect if redirectTo was explicitly set (e.g., after OAuth login)
      const redirectTo = sessionStorage.getItem('redirectTo');
      if (redirectTo) {
        sessionStorage.removeItem('redirectTo');
        // Only redirect if we're not already on that page
        if (window.location.pathname !== redirectTo) {
          window.location.replace(redirectTo);
        }
      }
      // If no redirectTo is set, stay on current page (don't force redirect to "/")
    }
  });
}

// Helper function to handle auth redirects
export const signInWithProvider = async (provider: 'google' | 'github' | 'facebook') => {
  if (typeof window === 'undefined') return;

  // Store the current URL to redirect back after sign in
  sessionStorage.setItem('redirectTo', window.location.pathname);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing in with provider:', error);
    throw error;
  }
};
