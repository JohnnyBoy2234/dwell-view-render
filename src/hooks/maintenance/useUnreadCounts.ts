import { useQuery } from '@tanstack/react-query';

async function fetchUnreadCounts(): Promise<Record<string, number>> {
  const res = await fetch('/api/maintenance/unread-counts');
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export function useUnreadCounts() {
  return useQuery({ queryKey: ['maintenance-unread-counts'], queryFn: fetchUnreadCounts });
}
