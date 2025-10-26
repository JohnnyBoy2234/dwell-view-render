import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, List, Calendar } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AccountingNavProps {
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  className?: string;
  selectedDateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

export function AccountingNav({ onAddIncome, onAddExpense, className = '', selectedDateRange, onDateRangeChange }: AccountingNavProps) {
  const location = useLocation();
  const isInvoicePage = location.pathname.includes('/invoices/tax');
  
  return (
    <nav className={`bg-card border rounded-lg p-2 shadow-sm ${className}`}>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
        <li className="w-full md:col-span-2">
          <Button 
            asChild
            variant={isInvoicePage ? 'default' : 'outline'} 
            className="w-full justify-center py-2 text-sm font-medium h-10 whitespace-nowrap"
          >
            <Link to="/enhancedlandlorddashboard/tax-invoice" className="flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <span>Generate Tax Invoice</span>
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
      {/* Date Range Picker */}
      <div className="mt-4 flex items-center justify-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !selectedDateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDateRange?.from ? (
                selectedDateRange.to ? (
                  <>
                    {format(selectedDateRange.from, 'MMM d, yyyy')} -{' '}
                    {format(selectedDateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(selectedDateRange.from, 'MMM d, yyyy')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={selectedDateRange?.from}
              selected={selectedDateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange?.({
                    from: range.from,
                    to: range.to
                  });
                }
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
