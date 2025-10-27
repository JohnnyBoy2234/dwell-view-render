import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, List } from 'lucide-react';

// Custom styles for accounting page buttons
const accountingButtonStyle = {
  border: '1px solid #00f0ff', // Neon blue border
  backgroundColor: '#dbeafe',   // Light blue background
  color: '#000000',            // Black text
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: '#bfdbfe', // Slightly darker blue on hover
    borderColor: '#00c4d4',    // Slightly darker neon blue on hover
    boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)', // Subtle glow on hover
  },
  '&:focus': {
    boxShadow: '0 0 0 2px rgba(0, 240, 255, 0.4)',
  },
};

interface AccountingNavProps {
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  className?: string;
}

export function AccountingNav({ onAddIncome, onAddExpense, className = '' }: AccountingNavProps) {
  const location = useLocation();
  const isInvoicePage = location.pathname.includes('/invoices/tax');
  
  return (
    <nav className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <ul className="grid grid-cols-2 gap-4">
        <li className="w-full">
          <Button 
            variant="outline" 
            onClick={onAddIncome}
            style={accountingButtonStyle}
            className="w-full justify-center py-2 text-sm font-medium h-12 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Add Income</span>
          </Button>
        </li>
        <li className="w-full">
          <Button 
            variant="outline" 
            onClick={onAddExpense}
            style={accountingButtonStyle}
            className="w-full justify-center py-2 text-sm font-medium h-12 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Add Expense</span>
          </Button>
        </li>
        <li className="col-span-2 w-full">
          <Button 
            asChild 
            variant={isInvoicePage ? 'default' : 'outline'} 
            style={!isInvoicePage ? accountingButtonStyle : {}}
            className={`w-full justify-center py-2 text-sm font-medium h-12 whitespace-nowrap ${isInvoicePage ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            <Link to="/dashboard/invoices/tax">
              <span>Generate Tax Invoice</span>
            </Link>
          </Button>
        </li>
        <li className="col-span-2 w-full">
          <Button 
            asChild 
            variant={location.pathname.includes('/accounting/transactions') ? 'default' : 'outline'} 
            style={!location.pathname.includes('/accounting/transactions') ? accountingButtonStyle : {}}
            className={`w-full justify-center py-2 text-sm font-medium h-12 whitespace-nowrap ${location.pathname.includes('/accounting/transactions') ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            <Link to="/dashboard/accounting/transactions" className="flex items-center justify-center gap-2">
              <List className="w-4 h-4 flex-shrink-0" />
              <span>View All Transactions</span>
            </Link>
          </Button>
        </li>
      </ul>
      <style dangerouslySetInnerHTML={{
        __html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      }} />
    </nav>
  );
}
