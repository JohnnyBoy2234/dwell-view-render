import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '../Navbar';
import '@testing-library/jest-dom';

describe('Navbar', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
  };

  it('renders the logo and navigation links', () => {
    render(<Navbar user={mockUser} onLogout={() => {}} />);
    
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/properties/i)).toBeInTheDocument();
  });

  it('shows user menu when clicking on avatar', () => {
    render(<Navbar user={mockUser} onLogout={() => {}} />);
    
    const avatar = screen.getByAltText(/user avatar/i);
    fireEvent.click(avatar);
    
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  it('calls onLogout when sign out is clicked', () => {
    const onLogout = vi.fn();
    render(<Navbar user={mockUser} onLogout={onLogout} />);
    
    const avatar = screen.getByAltText(/user avatar/i);
    fireEvent.click(avatar);
    
    const signOutButton = screen.getByText(/sign out/i);
    fireEvent.click(signOutButton);
    
    expect(onLogout).toHaveBeenCalled();
  });
});
