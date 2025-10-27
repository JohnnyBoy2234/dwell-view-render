import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, List } from 'lucide-react';

// Custom styles for accounting page buttons with dark theme
const accountingButtonStyle = {
  border: '1px solid #3b82f6', // Blue border
  backgroundColor: 'transparent', // Transparent background
  color: '#ffffff', // White text
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // Slight blue tint on hover
    borderColor: '#60a5fa', // Lighter blue border on hover
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)', // Subtle glow on hover
  },
  '&:focus': {
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.4)', // Focus ring
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
    <nav className={`bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-sm ${className}`}>
      <ul className="grid grid-cols-3 gap-2">
        <li className="w-full">
          <Button 
            variant="outline" 
            onClick={onAddIncome}
            style={accountingButtonStyle}
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap hover:bg-gray-700 transition-colors"
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
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap hover:bg-gray-700 transition-colors"
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
            style={!location.pathname.includes('/accounting/transactions') ? accountingButtonStyle : {}}
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
