import { vi } from 'vitest';

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

// Mock profile data
export const mockProfile = {
  id: 'test-user-id',
  username: 'testuser',
  full_name: 'Test User',
  phone_number: '+1234567890',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock trading account data
export const mockTradingAccount = {
  id: 'test-account-id',
  user_id: 'test-user-id',
  name: 'Test Account',
  initial_balance: 10000,
  current_balance: 10500,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock trade data
export const mockTrade = {
  id: 'test-trade-id',
  user_id: 'test-user-id',
  trading_account_id: 'test-account-id',
  date: '2024-01-15',
  pair: 'EURUSD',
  position: 'Long' as const,
  entry_price: 1.0850,
  exit_price: 1.0900,
  pnl_amount: 500,
  notes: 'Test trade',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ 
          data: table === 'profiles' ? mockProfile : mockTradingAccount, 
          error: null 
        }),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ 
            data: table === 'trades' ? [mockTrade] : [mockTradingAccount], 
            error: null 
          }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockTrade, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com' } }),
    })),
  },
});