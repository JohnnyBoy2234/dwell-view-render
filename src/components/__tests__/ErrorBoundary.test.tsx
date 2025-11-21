import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import '@testing-library/jest-dom';

// A component that throws an error for testing
const ErrorComponent = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  // Suppress console.error for this test file
  const originalError = console.error;
  
  beforeAll(() => {
    console.error = vi.fn(); // Suppress error logs in test output
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('displays error message when child component throws', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onError when child component throws', () => {
    const handleError = vi.fn();
    
    render(
      <ErrorBoundary onError={handleError} fallback={<div>Error occurred</div>}>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });
});
