// jsdom in this toolchain does not implement the Web Storage API, and Node's
// experimental global localStorage is gated behind a flag. useAuth reads
// bare `localStorage`/`sessionStorage`, so provide an in-memory implementation.

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null {
    const value = this.store.get(key);
    return value === undefined ? null : value;
  }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

// MemoryStorage covers the getItem/setItem/removeItem/clear surface the hook
// uses; cast at this boundary since it deliberately omits the string-index
// signature of the DOM Storage type.
const local = new MemoryStorage() as unknown as Storage;
const session = new MemoryStorage() as unknown as Storage;

for (const [name, value] of [['localStorage', local], ['sessionStorage', session]] as const) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, { value, configurable: true, writable: true });
  }
}
