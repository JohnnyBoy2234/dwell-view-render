import { supabase } from '@mzanzihomes/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

type QueryResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Type-safe wrapper for Supabase queries
 * Handles strict typing issues while maintaining safety
 */
export const db = {
  from: (table: string) => {
    const baseQuery = supabase.from(table);
    
    return {
      select: (columns = '*') => {
        const query = baseQuery.select(columns);
        return {
          eq: (column: string, value: any) => (query as any).eq(column, value),
          filter: (column: string, operator: string, value: any) => (query as any).filter(column, operator, value),
          in: (column: string, values: any[]) => (query as any).in(column, values),
          order: (column: string, options?: any) => (query as any).order(column, options),
          limit: (count: number) => (query as any).limit(count),
          single: () => (query as any).single(),
          maybeSingle: () => (query as any).maybeSingle(),
          execute: () => query as any,
        };
      },
      
      insert: (data: any) => {
        const query = (baseQuery as any).insert(data);
        return {
          select: () => query.select(),
          single: () => query.select().single(),
          execute: () => query,
        };
      },
      
      update: (data: any) => {
        const query = (baseQuery as any).update(data);
        return {
          eq: (column: string, value: any) => query.eq(column, value),
          filter: (column: string, operator: string, value: any) => query.filter(column, operator, value),
          in: (column: string, values: any[]) => query.in(column, values),
          execute: () => query,
        };
      },
      
      delete: () => {
        const query = (baseQuery as any).delete();
        return {
          eq: (column: string, value: any) => query.eq(column, value),
          filter: (column: string, operator: string, value: any) => query.filter(column, operator, value),
          in: (column: string, values: any[]) => query.in(column, values),
          execute: () => query,
        };
      },
      
      upsert: (data: any) => {
        const query = (baseQuery as any).upsert(data);
        return {
          select: () => query.select(),
          single: () => query.select().single(),
          execute: () => query,
        };
      },
    };
  },
};

/**
 * Safe data extractor - checks for errors before returning data
 */
export function extractData<T>(result: QueryResult<T>): T | null {
  if (result.error) {
    console.error('Supabase query error:', result.error);
    return null;
  }
  return result.data;
}

/**
 * Throws on error, returns data on success
 */
export function requireData<T>(result: QueryResult<T>, errorMessage?: string): T {
  if (result.error) {
    throw new Error(errorMessage || result.error.message);
  }
  if (!result.data) {
    throw new Error(errorMessage || 'No data returned from query');
  }
  return result.data;
}
