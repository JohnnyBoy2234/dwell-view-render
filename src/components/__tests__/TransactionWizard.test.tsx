import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionWizard } from '../accounting/TransactionWizard';
import '@testing-library/jest-dom';

// Mock the child components
vi.mock('../accounting/steps/IncomeStep', () => ({
  IncomeStep: ({ onNext, onCancel }) => (
    <div>
      <h2>Income Step</h2>
      <button onClick={() => onNext({ amount: 1000, description: 'Test Income' })}>
        Next
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../accounting/steps/ExpenseStep', () => ({
  ExpenseStep: ({ onNext, onCancel, onBack }) => (
    <div>
      <h2>Expense Step</h2>
      <button onClick={() => onNext({ amount: 500, description: 'Test Expense' })}>
        Next
      </button>
      <button onClick={onBack}>Back</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../accounting/steps/TransactionSummary', () => ({
  TransactionSummary: ({ transaction, onConfirm, onBack }) => (
    <div>
      <h2>Summary</h2>
      <div data-testid="transaction-amount">{transaction.amount}</div>
      <div data-testid="transaction-description">{transaction.description}</div>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('TransactionWizard', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the income step by default', () => {
    render(
      <TransactionWizard 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByText('Income Step')).toBeInTheDocument();
  });

  it('navigates through all steps and completes the transaction', async () => {
    render(
      <TransactionWizard 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    );

    // Start with Income Step
    expect(screen.getByText('Income Step')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Should be on Expense Step now
    await waitFor(() => {
      expect(screen.getByText('Expense Step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Next'));

    // Should be on Summary Step now
    await waitFor(() => {
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByTestId('transaction-amount')).toHaveTextContent('500');
      expect(screen.getByTestId('transaction-description')).toHaveTextContent('Test Expense');
    });
    
    fireEvent.click(screen.getByText('Confirm'));

    // onComplete should be called with the transaction data
    expect(mockOnComplete).toHaveBeenCalledWith({
      amount: 500,
      description: 'Test Expense',
      // Add other expected fields based on your implementation
    });
  });

  it('allows going back to previous steps', async () => {
    render(
      <TransactionWizard 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    );

    // Go to Expense Step
    fireEvent.click(screen.getByText('Next'));
    
    // Go back to Income Step
    fireEvent.click(await screen.findByText('Back'));
    
    // Should be back on Income Step
    await waitFor(() => {
      expect(screen.getByText('Income Step')).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel is clicked', () => {
    render(
      <TransactionWizard 
        onComplete={mockOnComplete} 
        onCancel={mockOnCancel} 
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
