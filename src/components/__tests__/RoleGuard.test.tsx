import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleGuard } from '../RoleGuard';
import '@testing-library/jest-dom';

// Mock child components
const AdminDashboard = () => <div>Admin Dashboard</div>;
const ManagerDashboard = () => <div>Manager Dashboard</div>;
const Unauthorized = () => <div>Unauthorized Access</div>;

describe('RoleGuard', () => {
  it('allows access for users with required role', () => {
    const mockUser = { role: 'admin' };
    
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route 
            path="/admin" 
            element={
              <RoleGuard allowedRoles={['admin']} user={mockUser}>
                <AdminDashboard />
              </RoleGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Access')).not.toBeInTheDocument();
  });

  it('allows access for users with one of the allowed roles', () => {
    const mockUser = { role: 'manager' };
    
    render(
      <MemoryRouter initialEntries={['/manage']}>
        <Routes>
          <Route 
            path="/manage" 
            element={
              <RoleGuard allowedRoles={['admin', 'manager']} user={mockUser}>
                <ManagerDashboard />
              </RoleGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
  });

  it('denies access for users without required role', () => {
    const mockUser = { role: 'user' };
    
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route 
            path="/admin" 
            element={
              <RoleGuard 
                allowedRoles={['admin']} 
                user={mockUser}
                fallback={<Unauthorized />}
              />
            } 
          />
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
              <RoleGuard 
                allowedRoles={['admin']} 
                user={null}
                redirectTo="/login"
              />
            } 
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
