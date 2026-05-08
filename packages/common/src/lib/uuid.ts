export function generateId(): string {
  // Prefer browser Web Crypto API when available
  try {
    const g: any = globalThis as any;
    if (g && g.crypto && typeof g.crypto.randomUUID === 'function') {
      return g.crypto.randomUUID();
    }
  } catch {}

  // RFC4122 v4 fallback
  // eslint-disable-next-line no-bitwise
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
