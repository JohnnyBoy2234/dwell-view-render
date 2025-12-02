import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ContractBuilder } from '@/components/lease/ContractBuilder';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock the authentication hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    functions: {
      invoke: vi.fn()
    },
    rpc: vi.fn()
  }
}));

// Mock the useLeaseContracts hook
vi.mock('@/hooks/useLeaseContracts', () => ({
  useLeaseContracts: () => ({
    createContract: vi.fn().mockResolvedValue('test-contract-id'),
    updateContract: vi.fn().mockResolvedValue(true),
    generatePDF: vi.fn().mockResolvedValue('https://example.com/lease-contract.pdf'),
    contracts: [],
    loading: false,
    error: null
  })
}));

describe('Contract Generator', () => {
  const queryClient = new QueryClient();
  
  // Mock user data
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  };

  // Sample contract data
  const sampleContractData = {
    propertyAddress: '123 Test Street, Cape Town',
    propertyType: 'Apartment',
    landlordName: 'Test Landlord',
    landlordEmail: 'landlord@example.com',
    landloardIdNumber: '1234567890123',
    landlordAddress: '456 Owner Ave, Cape Town',
    landlordPhone: '0123456789',
    tenantName: 'Test Tenant',
    tenantEmail: 'tenant@example.com',
    tenantIdNumber: '9876543210987',
    tenantAddress: '789 Renter Rd, Cape Town',
    tenantPhone: '0987654321',
    landlordBankName: 'Test Bank',
    landlordBranchCode: '123456',
    landlordBranchName: 'Cape Town CBD',
    landlordAccNumber: '1234567890',
    leaseStartDate: '2025-01-01',
    leaseEndDate: '2025-12-31',
    rentAmount: 10000,
    rentCurrency: 'ZAR',
    rentPaymentFrequency: 'monthly',
    rentDueDay: 1,
    securityDeposit: 10000,
    petsAllowed: false,
    smokingAllowed: false,
    furnishedStatus: 'unfurnished',
    jurisdiction: 'South Africa'
  };

  // Set up test environment
  beforeAll(() => {
    // Mock useAuth to return our test user
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isLandlord: true,
      isTenant: false,
      isAdmin: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn()
    });

    // Mock window.URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render the component with required providers
  const renderContractBuilder = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ContractBuilder />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders the contract builder form', () => {
    renderContractBuilder();
    expect(screen.getByText('Create New Lease Agreement')).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Address/i)).toBeInTheDocument();
  });

  it('allows filling out the contract form', async () => {
    renderContractBuilder();
    
    // Fill in property details
    await userEvent.type(
      screen.getByLabelText(/Property Address/i), 
      sampleContractData.propertyAddress
    );
    
    await userEvent.type(
      screen.getByLabelText(/Property Type/i),
      sampleContractData.propertyType
    );

    // Test that the input values are set correctly
    expect(screen.getByLabelText(/Property Address/i)).toHaveValue(sampleContractData.propertyAddress);
    expect(screen.getByLabelText(/Property Type/i)).toHaveValue(sampleContractData.propertyType);
  });

  it('submits the form and generates a PDF', async () => {
    // Mock the PDF generation response
    const mockPdfUrl = 'https://example.com/generated-contract.pdf';
    const mockGeneratePdf = vi.fn().mockResolvedValue(mockPdfUrl);
    
    // Override the mock for this test
    vi.mocked(useLeaseContracts).mockReturnValue({
      createContract: vi.fn().mockResolvedValue('test-contract-id'),
      updateContract: vi.fn().mockResolvedValue(true),
      generatePDF: mockGeneratePdf,
      contracts: [],
      loading: false,
      error: null
    });

    renderContractBuilder();

    // Fill in required fields (simplified for test)
    await userEvent.type(
      screen.getByLabelText(/Property Address/i),
      sampleContractData.propertyAddress
    );
    
    // Click the generate PDF button
    const generateButton = screen.getByRole('button', { name: /Generate PDF/i });
    await userEvent.click(generateButton);

    // Wait for the PDF generation to complete
    await waitFor(() => {
      expect(mockGeneratePdf).toHaveBeenCalled();
    });

    // Verify the PDF URL is displayed or used
    const pdfLink = screen.getByRole('link', { name: /View Generated Contract/i });
    expect(pdfLink).toHaveAttribute('href', mockPdfUrl);
    
    console.log('Generated PDF URL:', mockPdfUrl);
  });

  it('handles form validation', async () => {
    renderContractBuilder();
    
    // Try to submit without filling required fields
    const generateButton = screen.getByRole('button', { name: /Generate PDF/i });
    await userEvent.click(generateButton);
    
    // Check for validation errors
    expect(await screen.findByText(/Property address is required/i)).toBeInTheDocument();
  });
});
