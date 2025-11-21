import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  data: null,
  error: null,
};

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

export function renderWithProviders(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  
  return {
    ...render(
      <QueryClientProvider client={testQueryClient}>
        <Router>
          {ui}
        </Router>
      </QueryClientProvider>
    ),
    queryClient: testQueryClient,
  };
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

export const mockSupabase = mockSupabaseClient;
