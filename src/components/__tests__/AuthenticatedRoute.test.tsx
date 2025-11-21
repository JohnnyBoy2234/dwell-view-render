import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthenticatedRoute } from '../AuthenticatedRoute';
import '@testing-library/jest-dom';

// Mock child component
const MockDashboard = () => <div>Dashboard Content</div>;
const MockLogin = () => <div>Login Page</div>;

describe('AuthenticatedRoute', () => {
  it('renders the component when user is authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route 
            path="/dashboard" 
            element={
              <AuthenticatedRoute user={{ id: '123' }}>
                <MockDashboard />
              </AuthenticatedRoute>
            } 
          />
          <Route path="/login" element={<MockLogin />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route 
            path="/dashboard" 
            element={
              <AuthenticatedRoute user={null}>
                <MockDashboard />
              </AuthenticatedRoute>
            } 
          />
          <Route path="/login" element={<MockLogin />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});
