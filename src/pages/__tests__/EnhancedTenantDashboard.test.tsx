import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedTenantDashboard } from '../EnhancedTenantDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, useNavigate, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock hooks and components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', role: 'tenant' },
    isLandlord: false,
  }),
}));

vi.mock('@/hooks/useUnreadMessages', () => ({
  useUnreadMessages: () => ({
    unreadCount: 2,
  }),
}));

vi.mock('@/hooks/useTenantDashboard', () => ({
  useTenantDashboard: () => ({
    loading: false,
    rentDue: {
      id: 'rent-123',
      amount: 10000, // R10,000
      dueDate: '2023-06-01',
      status: 'pending',
      tenancyId: 'tenancy-123',
    },
    tenantProperty: {
      id: 'prop-123',
      name: 'Sunset Apartments',
      address: '123 Sunset Blvd, Cape Town',
      rentAmount: 10000,
      bedrooms: 2,
      bathrooms: 2,
      imageUrl: '/placeholder.jpg',
    },
    recentMaintenance: [
      {
        id: 'maint-1',
        title: 'Leaking tap',
        status: 'pending',
        createdAt: '2023-05-15T10:00:00Z',
        description: 'Kitchen tap is leaking',
      },
    ],
    upcomingViewings: [
      {
        id: 'view-1',
        propertyId: 'prop-123',
        scheduledFor: '2023-06-15T14:00:00Z',
        status: 'scheduled',
      },
    ],
    refetch: vi.fn(),
  }),
}));

// Mock child components
vi.mock('@/components/dashboard/EnhancedDashboardLayout', () => ({
  EnhancedDashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/components/dashboard/tenant/RentDueCard', () => ({
  RentDueCard: ({ amount, dueDate }: { amount: number; dueDate: string }) => (
    <div data-testid="rent-due-card">
      R{amount} due {dueDate}
    </div>
  ),
}));

vi.mock('@/components/lease/LeaseDashboard', () => ({
  LeaseDashboard: () => <div data-testid="lease-dashboard">Lease Dashboard</div>,
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/enhancedtenantdashboard' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

describe('EnhancedTenantDashboard', () => {
  const queryClient = new QueryClient();
  
  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <EnhancedTenantDashboard />
        </Router>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useTenantDashboard).mockReturnValueOnce({
      ...useTenantDashboard(),
      loading: true,
    });
    
    renderComponent();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    // Check for skeleton loaders
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the dashboard with property information', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Check property info is displayed
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
      expect(screen.getByText('123 Sunset Blvd, Cape Town')).toBeInTheDocument();
      
      // Check rent due card
      expect(screen.getByTestId('rent-due-card')).toHaveTextContent('R10000 due 2023-06-01');
      
      // Check maintenance requests
      expect(screen.getByText('Leaking tap')).toBeInTheDocument();
      
      // Check navigation cards
      expect(screen.getByText('Property Viewings')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Lease Contracts')).toBeInTheDocument();
    });
  });

  it('navigates to lease dashboard when lease tab is clicked', async () => {
    renderComponent();
    
    // Simulate clicking on the leases tab
    fireEvent.click(screen.getByText('Lease Contracts'));
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/enhancedtenantdashboard/leases');
    });
  });

  it('redirects to auth when user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      isLandlord: false,
    });
    
    renderComponent();
    
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  it('redirects to landlord dashboard if user is a landlord', () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: { id: 'landlord-123', role: 'landlord' },
      isLandlord: true,
    });
    
    renderComponent();
    
    expect(mockNavigate).toHaveBeenCalledWith('/enhancedlandlorddashboard');
  });
});
