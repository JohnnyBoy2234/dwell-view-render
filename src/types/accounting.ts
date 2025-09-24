export interface Transaction {
  id: string;
  user_id: string;
  property_id: string | null;
  type: 'income' | 'expense';
  date: string;
  amount: number;
  vat_percent: number;
  category: string;
  vendor?: string;
  description?: string;
  billable: boolean;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  type: 'income' | 'expense';
  date: string;
  amount: number;
  vat_percent: number;
  category: string;
  property_id: string | null;
  vendor?: string;
  description?: string;
  billable: boolean;
  receipt_url?: string;
}

export interface AccountingKPIs {
  rentCollected: number;
  expenses: number;
  netIncome: number;
  unpaidRent: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryData {
  category: string;
  amount: number;
}

export const INCOME_CATEGORIES = ['Rent'] as const;

export const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Utilities (Water/Electricity)',
  'Rates & Taxes',
  'Insurance',
  'Bank Fees',
  'SwiftRent Subscription',
  'Other'
] as const;

export const getDefaultVATPercent = (category: string): number => {
  const highVATCategories = ['Maintenance', 'Insurance', 'SwiftRent Subscription'];
  return highVATCategories.includes(category) ? 15 : 0;
};