import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, List } from 'lucide-react';

// Light blue button styles for accounting navigation
const buttonBaseStyle = {
  border: '1px solid #7dd3fc', // Light blue border
  backgroundColor: 'rgba(191, 219, 254, 0.1)', // Very light blue transparent background
  color: '#e0f2fe', // Light blue text
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(147, 197, 253, 0.2)', // Slightly more opaque on hover
    borderColor: '#93c5fd', // Lighter blue border on hover
    boxShadow: '0 0 10px rgba(147, 197, 253, 0.3)', // Soft blue glow on hover
  },
  '&:focus': {
    boxShadow: '0 0 0 2px rgba(147, 197, 253, 0.4)', // Light blue focus ring
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
    <nav className={`bg-gray-800 rounded-lg p-3 shadow-lg ${className}`}>
      <ul className="grid grid-cols-3 gap-3">
        <li className="w-full">
          <Button 
            variant="outline" 
            onClick={onAddIncome}
            style={buttonBaseStyle}
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Add Income</span>
          </Button>
        </li>
        <li className="w-full">
          <Button 
            variant="outline" 
            onClick={onAddExpense}
            style={buttonBaseStyle}
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Add Expense</span>
          </Button>
        </li>
        <li className="col-span-1 w-full">
          <Button 
            asChild 
            variant="outline"
            style={buttonBaseStyle}
            className={`w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap ${isInvoicePage ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
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
            style={!location.pathname.includes('/accounting/transactions') ? buttonBaseStyle : {}}
            className={`w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap ${location.pathname.includes('/accounting/transactions') ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
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
