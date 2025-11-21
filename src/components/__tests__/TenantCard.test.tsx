import { render, screen, fireEvent } from '@testing-library/react';
import { TenantCard } from '../TenantCard';
import '@testing-library/jest-dom';

const mockTenant = {
  id: '1',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '123-456-7890',
  status: 'active',
  property_name: 'Sunset Apartments #42',
  lease_end_date: '2024-12-31',
  avatar_url: 'https://example.com/avatar.jpg',
};

describe('TenantCard', () => {
  it('renders tenant information correctly', () => {
    render(<TenantCard tenant={mockTenant} onEdit={() => {}} onDelete={() => {}} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    expect(screen.getByText('Sunset Apartments #42')).toBeInTheDocument();
    expect(screen.getByText('Lease ends: 2024-12-31')).toBeInTheDocument();
    expect(screen.getByText('Active')).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<TenantCard tenant={mockTenant} onEdit={onEdit} onDelete={() => {}} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockTenant.id);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<TenantCard tenant={mockTenant} onEdit={() => {}} onDelete={onDelete} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledWith(mockTenant.id);
  });

  it('shows inactive status correctly', () => {
    const inactiveTenant = { ...mockTenant, status: 'inactive' };
    render(<TenantCard tenant={inactiveTenant} onEdit={() => {}} onDelete={() => {}} />);
    
    expect(screen.getByText('Inactive')).toHaveClass('bg-gray-100', 'text-gray-800');
  });
});
