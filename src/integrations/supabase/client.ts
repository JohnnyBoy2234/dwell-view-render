import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get URL and key from environment variables with fallback to current values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rsfrvjaqxhoqavvscvwf.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig";

// Get site URL for auth redirects
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rentlekker.com';

// Create the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    flowType: 'pkce',
  },
});

// Set up auth state change handler
if (typeof window !== 'undefined') {
  // Handle redirects after sign in
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Set the redirect URL in the session
      const redirectTo = sessionStorage.getItem('redirectTo') || `${siteUrl}/dashboard`;
      sessionStorage.removeItem('redirectTo');
      
      // If we have a redirect URL, navigate there
      if (redirectTo && window.location.pathname !== redirectTo) {
        window.location.href = redirectTo;
      }
    }
  });

  // Set the redirect URL for auth flows
  const currentUrl = new URL(window.location.href);
  if (currentUrl.pathname === '/auth/callback') {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session) {
      // User is signed in, redirect to dashboard or intended URL
      const redirectTo = sessionStorage.getItem('redirectTo') || `${siteUrl}/dashboard`;
      sessionStorage.removeItem('redirectTo');
      window.location.href = redirectTo;
    } else if (error) {
      console.error('Error getting session:', error);
    }
  }
}

// Helper function to handle auth redirects
export const signInWithProvider = async (provider: 'google' | 'github' | 'facebook') => {
  if (typeof window === 'undefined') return;
  
  // Store the current URL to redirect back after sign in
  sessionStorage.setItem('redirectTo', window.location.pathname);
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });
  
  if (error) {
    console.error('Error signing in with provider:', error);
    throw error;
  }
};