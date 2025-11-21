import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EnhancedLandlordDashboard } from '../EnhancedLandlordDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock hooks and components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'landlord-123', role: 'landlord' },
    isLandlord: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLandlordApplications', () => ({
  useLandlordApplications: () => ({
    applications: [],
    loading: false,
    fetchAllApplications: vi.fn(),
    updateApplicationStatus: vi.fn(),
  }),
}));

// Mock child components
vi.mock('@/components/dashboard/EnhancedDashboardLayout', () => ({
  EnhancedDashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/components/lease/LeaseDashboard', () => ({
  LeaseDashboard: () => <div data-testid="lease-dashboard">Lease Dashboard</div>,
}));

vi.mock('@/components/accounting/AccountingOverview', () => ({
  AccountingOverview: () => <div data-testid="accounting-overview">Accounting Overview</div>,
}));

vi.mock('@/components/landlord/ApplicationRequestsManager', () => ({
  ApplicationRequestsManager: () => (
    <div data-testid="application-requests-manager">Application Requests</div>
  ),
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/enhancedlandlorddashboard' };
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    data: [],
    error: null,
    then: function(cb: any) {
      return cb({
        data: this.data,
        error: this.error,
      });
    },
  },
}));

describe('EnhancedLandlordDashboard', () => {
  const queryClient = new QueryClient();
  
  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <EnhancedLandlordDashboard />
        </Router>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', async () => {
    // Mock loading state
    vi.mocked(useAuth).mockReturnValueOnce({
      user: { id: 'landlord-123', role: 'landlord' },
      isLandlord: true,
      loading: true,
    });
    
    renderComponent();
    
    // Check for loading state
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the dashboard with property information', async () => {
    // Mock property data
    const mockProperties = [
      {
        id: 'prop-123',
        title: 'Luxury Apartment',
        location: '123 Beach Road, Cape Town',
        price: 15000,
        status: 'occupied',
        images: ['/placeholder.jpg'],
      },
    ];
    
    // @ts-ignore
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      data: mockProperties,
      error: null,
    });
    
    renderComponent();
    
    await waitFor(() => {
      // Check if the dashboard renders with property information
      expect(screen.getByText('Luxury Apartment')).toBeInTheDocument();
      expect(screen.getByText('123 Beach Road, Cape Town')).toBeInTheDocument();
      
      // Check for navigation tabs
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('Tenants')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Accounting')).toBeInTheDocument();
    });
  });

  it('navigates to different tabs', async () => {
    renderComponent();
    
    // Test navigation to Properties tab
    fireEvent.click(screen.getByText('Properties'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/enhancedlandlorddashboard/properties');
    });
    
    // Test navigation to Tenants tab
    fireEvent.click(screen.getByText('Tenants'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/enhancedlandlorddashboard/tenants');
    });
    
    // Test navigation to Accounting tab
    fireEvent.click(screen.getByText('Accounting'));
    await waitFor(() => {
      expect(screen.getByTestId('accounting-overview')).toBeInTheDocument();
    });
  });

  it('handles property selection', async () => {
    const mockProperties = [
      { id: 'prop-123', title: 'Property 1' },
      { id: 'prop-456', title: 'Property 2' },
    ];
    
    // @ts-ignore
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      data: mockProperties,
      error: null,
    });
    
    renderComponent();
    
    // Wait for properties to load
    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
      expect(screen.getByText('Property 2')).toBeInTheDocument();
    });
    
    // Test property selection
    fireEvent.click(screen.getByText('Property 1'));
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function));
  });

  it('redirects non-landlord users', async () => {
    // Mock non-landlord user
    vi.mocked(useAuth).mockReturnValueOnce({
      user: { id: 'user-123', role: 'tenant' },
      isLandlord: false,
      loading: false,
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/enhancedtenantdashboard');
    });
  });

  it('redirects unauthenticated users to login', async () => {
    // Mock unauthenticated user
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      isLandlord: false,
      loading: false,
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });
});
