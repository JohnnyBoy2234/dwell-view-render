/** 'YYYY-MM' bill period → human month, e.g. '2026-01' → 'January 2026'. */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return '';
  const [year, month] = String(period).split('-').map(Number);
  if (!year || !month) return String(period);
  return new Date(year, month - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}
