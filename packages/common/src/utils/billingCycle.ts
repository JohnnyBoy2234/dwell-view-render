// Billing window: from (last day of month − 2) through month end.
// Self-healing: any daily run inside the window creates missing bills.

export function currentBillingPeriod(today: Date): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isInBillingWindow(today: Date): boolean {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() >= lastDay - 2;
}
