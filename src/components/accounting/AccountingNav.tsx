import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, List } from 'lucide-react';

interface AccountingNavProps {
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  className?: string;
}

export function AccountingNav({ onAddIncome, onAddExpense, className = '' }: AccountingNavProps) {
  const location = useLocation();
  const isInvoicePage = location.pathname.includes('/invoices/tax');
  
  return (
    <nav className={`bg-card border rounded-lg p-2 shadow-sm ${className}`}>
      <ul className="flex items-center justify-between space-x-1 overflow-x-auto no-scrollbar">
        <li className="flex-1 min-w-0">
          <Button 
            asChild 
            variant={!isInvoicePage ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10"
          >
            <Link to="/dashboard/accounting">
              Overview
            </Link>
          </Button>
        </li>
        <li className="flex-1 min-w-0">
          <Button 
            variant="outline" 
            onClick={onAddIncome}
            className="w-full justify-center py-2 text-sm font-medium h-10"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="truncate">Add Income</span>
          </Button>
        </li>
        <li className="flex-1 min-w-0">
          <Button 
            variant="outline" 
            onClick={onAddExpense}
            className="w-full justify-center py-2 text-sm font-medium h-10"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="truncate">Add Expense</span>
          </Button>
        </li>
        <li className="flex-1 min-w-0">
          <Button 
            asChild 
            variant={isInvoicePage ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10"
          >
            <Link to="/dashboard/invoices/tax">
              <span className="truncate">Generate Tax Invoice</span>
            </Link>
          </Button>
        </li>
        <li className="flex-1 min-w-0">
          <Button 
            asChild 
            variant={location.pathname.includes('/accounting/transactions') ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10"
          >
            <Link to="/dashboard/accounting/transactions">
              <List className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">View All</span>
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
