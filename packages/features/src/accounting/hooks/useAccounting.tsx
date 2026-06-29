// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { Transaction, AccountingKPIs, MonthlyData, CategoryData } from '@mzanzihomes/common/types/accounting';
import { toast } from '@mzanzihomes/ui/hooks/use-toast';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export function useAccounting() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactions = async (month?: Date, propertyId?: string) => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (month) {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        query = query
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'));
      }

      if (propertyId && propertyId !== 'all') {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsByDateRange = useCallback(async (from: Date, to: Date, propertyId?: string) => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(from, 'yyyy-MM-dd'))
        .lte('date', format(to, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (propertyId && propertyId !== 'all') {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data as Transaction, ...prev]);
      toast({
        title: "Success",
        description: "Transaction saved successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => prev.map(t => t.id === id ? data as Transaction : t));
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });

      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
      return false;
    }
  };

  const calculateKPIs = (transactionList: Transaction[]): AccountingKPIs => {
    const income = transactionList
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactionList
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      rentCollected: income,
      expenses,
      netIncome: income - expenses,
      unpaidRent: 0, // Placeholder for now
    };
  };

  const getMonthlyData = async (months: number = 6, propertyId?: string): Promise<MonthlyData[]> => {
    if (!user) return [];

    try {
      const startDate = subMonths(new Date(), months - 1);
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startOfMonth(startDate), 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (propertyId && propertyId !== 'all') {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const monthlyMap = new Map<string, { income: number; expense: number }>();
      
      // Initialize all months
      for (let i = 0; i < months; i++) {
        const month = subMonths(new Date(), months - 1 - i);
        const key = format(month, 'MMM yyyy');
        monthlyMap.set(key, { income: 0, expense: 0 });
      }

      // Aggregate data
      (data as Transaction[])?.forEach(transaction => {
        const month = format(new Date(transaction.date), 'MMM yyyy');
        const existing = monthlyMap.get(month);
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += Number(transaction.amount);
          } else {
            existing.expense += Number(transaction.amount);
          }
        }
      });

      return Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data,
      }));
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      return [];
    }
  };

  const getMonthlyDataByRange = useCallback(async (from: Date, to: Date, propertyId?: string): Promise<MonthlyData[]> => {
    if (!user) return [];

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(from, 'yyyy-MM-dd'))
        .lte('date', format(to, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (propertyId && propertyId !== 'all') {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const monthlyMap = new Map<string, { income: number; expense: number }>();

      // Initialize months within the range
      let currentMonth = new Date(from.getFullYear(), from.getMonth(), 1);
      const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);

      while (currentMonth <= endMonth) {
        const key = format(currentMonth, 'MMM yyyy');
        monthlyMap.set(key, { income: 0, expense: 0 });
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      }

      // Aggregate data
      (data as Transaction[])?.forEach(transaction => {
        const month = format(new Date(transaction.date), 'MMM yyyy');
        const existing = monthlyMap.get(month);
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += Number(transaction.amount);
          } else {
            existing.expense += Number(transaction.amount);
          }
        }
      });

      return Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data,
      }));
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      return [];
    }
  }, [user]);

  const getCategoryData = useCallback((transactionList: Transaction[]): CategoryData[] => {
    const categoryMap = new Map<string, number>();
    
    transactionList
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const existing = categoryMap.get(transaction.category) || 0;
        categoryMap.set(transaction.category, existing + Number(transaction.amount));
      });

    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, []);

  const calculateMonthlyDataFromTransactions = useCallback((
    transactionList: Transaction[], 
    from: Date, 
    to: Date
  ): MonthlyData[] => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    
    // Initialize months within the range
    let currentMonth = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
    
    while (currentMonth <= endMonth) {
      const key = format(currentMonth, 'MMM yyyy');
      monthlyMap.set(key, { income: 0, expense: 0 });
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    
    // Aggregate data from transaction list
    transactionList.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      // Only include transactions within the date range
      if (transactionDate >= from && transactionDate <= to) {
        const month = format(transactionDate, 'MMM yyyy');
        const existing = monthlyMap.get(month);
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += Number(transaction.amount);
          } else {
            existing.expense += Number(transaction.amount);
          }
        }
      }
    });
    
    return Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }, []);
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const createBatchTransactions = async (transactionsData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => {
    if (!user || transactionsData.length === 0) return null;

    try {
      const transactionsToInsert = transactionsData.map(transaction => ({
        ...transaction,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();

      if (error) throw error;

      setTransactions(prev => [...(data as Transaction[]), ...prev]);
      toast({
        title: "Success",
        description: `${data.length} transaction${data.length !== 1 ? 's' : ''} saved successfully`,
      });

      return data;
    } catch (error) {
      console.error('Error creating batch transactions:', error);
      toast({
        title: "Error",
        description: "Failed to save transactions",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    fetchTransactionsByDateRange,
    createTransaction,
    createBatchTransactions,
    updateTransaction,
    deleteTransaction,
    calculateKPIs,
    getMonthlyData,
    getMonthlyDataByRange,
    getCategoryData,
      calculateMonthlyDataFromTransactions,
  };
}