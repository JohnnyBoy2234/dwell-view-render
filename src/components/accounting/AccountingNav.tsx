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
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <li className="w-full">
          <Button 
            asChild 
            variant={!isInvoicePage && !location.pathname.includes('/accounting/transactions') ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
          >
            <Link to="/dashboard/accounting">
              Overview
            </Link>
          </Button>
        </li>
        <li className="w-full">
          <Button 
            variant="outline" 
            onClick={onAddIncome}
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
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Add Expense</span>
          </Button>
        </li>
        <li className="w-full">
          <Button 
            asChild 
            variant={isInvoicePage ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
          >
            <Link to="/dashboard/invoices/tax">
              <span>Tax Invoice</span>
            </Link>
          </Button>
        </li>
        <li className="col-span-2 sm:col-span-3 md:col-span-5 w-full">
          <Button 
            asChild 
            variant={location.pathname.includes('/accounting/transactions') ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
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
