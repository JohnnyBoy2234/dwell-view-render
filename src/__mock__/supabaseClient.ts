// Minimal mock so you never hit real Supabase
export const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        single: vi.fn(async () => ({ data: {}, error: null })),
        limit: vi.fn().mockReturnThis(),
        count: 'exact',
        head: true,
      })),
      insert: vi.fn(async () => ({ data: [{ id: 'm1' }], error: null })),
      update: vi.fn(async () => ({ data: [], error: null })),
    })),
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
    },
    channel: vi.fn(() => ({
      subscribe: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      send: vi.fn(async () => ({ status: 'ok' })),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: 'x' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.url/file' } })),
      })),
    },
  }
  