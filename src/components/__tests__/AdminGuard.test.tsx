import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminGuard } from '../AdminGuard';
import '@testing-library/jest-dom';

// Mock child components
const AdminDashboard = () => <div>Admin Dashboard</div>;
const Unauthorized = () => <div>Unauthorized Access</div>;

describe('AdminGuard', () => {
  it('allows access for admin users', () => {
    const mockUser = { role: 'admin' };
    
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route 
            path="/admin" 
            element={
              <AdminGuard user={mockUser}>
                <AdminDashboard />
              </AdminGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Access')).not.toBeInTheDocument();
  });

  it('denies access for non-admin users', () => {
    const mockUser = { role: 'user' };
    
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route 
            path="/admin" 
            element={
              <AdminGuard user={mockUser}>
                <AdminDashboard />
              </AdminGuard>
            } 
          />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route 
            path="/admin" 
            element={
              <AdminGuard user={null}>
                <AdminDashboard />
              </AdminGuard>
            } 
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});
