import { vi } from 'vitest';
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/lib/theme-context';

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock data generators
export const generateMockTrade = (overrides = {}) => ({
  id: `trade-${Math.random().toString(36).substr(2, 9)}`,
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
  ...overrides,
});

export const generateMockTrades = (count: number, overrides = {}) => {
  return Array.from({ length: count }, (_, index) => 
    generateMockTrade({
      id: `trade-${index}`,
      date: `2024-01-${String(15 + index).padStart(2, '0')}`,
      pnl_amount: index % 2 === 0 ? 100 + index * 50 : -(50 + index * 25),
      ...overrides,
    })
  );
};

export const generateMockAccount = (overrides = {}) => ({
  id: `account-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'test-user-id',
  name: 'Test Account',
  initial_balance: 10000,
  current_balance: 10500,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Test utilities
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

export const expectErrorMessage = async (message: string) => {
  await waitFor(() => {
    expect(screen.getByText(new RegExp(message, 'i'))).toBeInTheDocument();
  });
};

export const expectSuccessMessage = async (message: string) => {
  await waitFor(() => {
    expect(screen.getByText(new RegExp(message, 'i'))).toBeInTheDocument();
  });
};

// Mock API responses
export const mockSuccessfulAuth = () => {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
    error: null,
  } as any);
};

export const mockFailedAuth = () => {
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  } as any);
};

export const mockDatabaseQuery = (table: string, data: any) => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error: null }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null }),
        }),
      }),
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [data], error: null }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  } as any);
};

export const mockDatabaseError = (errorMessage: string) => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
      }),
    }),
  } as any);
};

// Performance testing utilities
export const measureRenderTime = (component: ReactElement) => {
  const startTime = performance.now();
  render(component);
  const endTime = performance.now();
  return endTime - startTime;
};

export const expectFastRender = (component: ReactElement, maxTime = 100) => {
  const renderTime = measureRenderTime(component);
  expect(renderTime).toBeLessThan(maxTime);
};

// Accessibility testing helpers
export const expectAccessibleForm = (formElement: HTMLElement) => {
  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const label = formElement.querySelector(`label[for="${input.id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const placeholder = input.getAttribute('placeholder');
    
    expect(label || ariaLabel || placeholder).toBeTruthy();
  });
};

// Data consistency helpers
export const expectConsistentData = (data: any[], keyField: string) => {
  const keys = data.map(item => item[keyField]);
  const uniqueKeys = new Set(keys);
  expect(uniqueKeys.size).toBe(keys.length); // No duplicates
};

export const expectValidTimestamps = (data: any[], timestampField: string) => {
  data.forEach(item => {
    const timestamp = new Date(item[timestampField]);
    expect(timestamp.getTime()).not.toBeNaN();
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });
};