// @ts-nocheck
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get URL and key from environment variables with fallback to current values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rsfrvjaqxhoqavvscvwf.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig";
const functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');

// Log Functions URL for debugging
console.log('[Supabase] Functions URL:', functionsUrl);

// Get site URL for auth redirects - use current domain by default
const getSiteUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

// Create the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    flowType: 'pkce',
  },
  functions: {
    url: functionsUrl,
  },
});

// Set up auth state change handler
if (typeof window !== 'undefined') {
  // Handle redirects after sign in - only redirect if explicitly requested
  supabase.auth.onAuthStateChange(async (event, session) => {
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
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });
  
  if (error) {
    console.error('Error signing in with provider:', error);
    throw error;
  }
};