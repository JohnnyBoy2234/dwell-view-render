import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Plus, FileText, Receipt, Calculator } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function AccountingNavigation() {
  const location = useLocation();
  
  const navItems = [
    {
      label: 'Overview',
      path: '/dashboard/accounting',
      icon: BarChart3,
    },
    {
      label: 'Add Transaction',
      path: '/dashboard/accounting/new',
      icon: Plus,
    },
    {
      label: 'All Transactions',
      path: '/dashboard/accounting/transactions',
      icon: FileText,
    },
    // SARS Summary removed per request
    {
      label: 'Tax Invoice',
      path: '/enhancedlandlorddashboard/tax-invoice',
      icon: Calculator,
    },
  ];

  return (
    <div className="bg-card border rounded-lg p-1 flex flex-wrap gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Button
            key={item.path}
            asChild
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "text-xs px-3 py-2 h-auto",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            <Link to={item.path}>
              <Icon className="w-3 h-3 mr-1.5" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}