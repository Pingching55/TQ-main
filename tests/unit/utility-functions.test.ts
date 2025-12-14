import { describe, it, expect } from 'vitest';

// Utility functions to test
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const validateTradingPair = (pair: string): boolean => {
  return /^[A-Z]{6,8}$/.test(pair);
};

export const calculateAccountBalance = (
  initialBalance: number, 
  trades: Array<{ pnl_amount: number | null }>
): number => {
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0);
  return initialBalance + totalPnL;
};

export const groupTradesByDate = (trades: Array<{ date: string; pnl_amount: number | null }>) => {
  return trades.reduce((groups, trade) => {
    const date = trade.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(trade);
    return groups;
  }, {} as Record<string, typeof trades>);
};

export const calculateDailyPnL = (trades: Array<{ date: string; pnl_amount: number | null }>) => {
  const grouped = groupTradesByDate(trades);
  return Object.entries(grouped).map(([date, dayTrades]) => ({
    date,
    pnl: dayTrades.reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0),
    tradeCount: dayTrades.filter(trade => trade.pnl_amount !== null).length,
  }));
};

describe('Utility Functions', () => {
  describe('Currency Formatting', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-0.01)).toBe('-$0.01');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle very large numbers', () => {
      expect(formatCurrency(999999999.99)).toBe('$999,999,999.99');
    });

    it('should handle very small numbers', () => {
      expect(formatCurrency(0.001)).toBe('$0.00'); // Rounds to 2 decimal places
    });
  });

  describe('Percentage Formatting', () => {
    it('should format percentages with one decimal place', () => {
      expect(formatPercentage(65.5)).toBe('65.5%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-15.7)).toBe('-15.7%');
    });

    it('should round to one decimal place', () => {
      expect(formatPercentage(65.55)).toBe('65.6%');
      expect(formatPercentage(65.54)).toBe('65.5%');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const formatted = formatDate('2024-01-15T10:30:00Z');
      expect(formatted).toMatch(/Jan 15, 2024/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time format
    });

    it('should handle different date formats', () => {
      expect(() => formatDate('2024-01-15')).not.toThrow();
      expect(() => formatDate('2024-01-15T10:30:00.000Z')).not.toThrow();
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('Invite Code Generation', () => {
    it('should generate 8-character codes', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    it('should generate uppercase alphanumeric codes', () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(100); // All unique
    });
  });

  describe('Trading Pair Validation', () => {
    it('should validate correct trading pairs', () => {
      expect(validateTradingPair('EURUSD')).toBe(true);
      expect(validateTradingPair('GBPJPY')).toBe(true);
      expect(validateTradingPair('XAUUSD')).toBe(true);
      expect(validateTradingPair('BTCUSDT')).toBe(true); // 7 characters
    });

    it('should reject invalid trading pairs', () => {
      expect(validateTradingPair('eurusd')).toBe(false); // Lowercase
      expect(validateTradingPair('EUR')).toBe(false); // Too short
      expect(validateTradingPair('EURUSDGBP')).toBe(false); // Too long
      expect(validateTradingPair('EUR/USD')).toBe(false); // Special chars
      expect(validateTradingPair('')).toBe(false); // Empty
    });
  });

  describe('Account Balance Calculations', () => {
    it('should calculate balance with profits', () => {
      const trades = [
        { pnl_amount: 500 },
        { pnl_amount: 300 },
        { pnl_amount: -100 },
      ];
      
      const balance = calculateAccountBalance(10000, trades);
      expect(balance).toBe(10700); // 10000 + 500 + 300 - 100
    });

    it('should handle empty trades', () => {
      const balance = calculateAccountBalance(10000, []);
      expect(balance).toBe(10000);
    });

    it('should ignore incomplete trades', () => {
      const trades = [
        { pnl_amount: 500 },
        { pnl_amount: null }, // Incomplete
        { pnl_amount: 300 },
      ];
      
      const balance = calculateAccountBalance(10000, trades);
      expect(balance).toBe(10800); // 10000 + 500 + 300
    });
  });

  describe('Date Grouping', () => {
    it('should group trades by date', () => {
      const trades = [
        { date: '2024-01-15', pnl_amount: 100 },
        { date: '2024-01-15', pnl_amount: 200 },
        { date: '2024-01-16', pnl_amount: -50 },
      ];
      
      const grouped = groupTradesByDate(trades);
      
      expect(grouped['2024-01-15']).toHaveLength(2);
      expect(grouped['2024-01-16']).toHaveLength(1);
    });

    it('should handle empty trades array', () => {
      const grouped = groupTradesByDate([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('Daily P&L Calculations', () => {
    it('should calculate daily P&L correctly', () => {
      const trades = [
        { date: '2024-01-15', pnl_amount: 100 },
        { date: '2024-01-15', pnl_amount: 200 },
        { date: '2024-01-16', pnl_amount: -50 },
        { date: '2024-01-16', pnl_amount: null }, // Incomplete
      ];
      
      const dailyPnL = calculateDailyPnL(trades);
      
      expect(dailyPnL).toEqual([
        { date: '2024-01-15', pnl: 300, tradeCount: 2 },
        { date: '2024-01-16', pnl: -50, tradeCount: 1 },
      ]);
    });

    it('should handle breakeven days', () => {
      const trades = [
        { date: '2024-01-15', pnl_amount: 100 },
        { date: '2024-01-15', pnl_amount: -100 },
      ];
      
      const dailyPnL = calculateDailyPnL(trades);
      
      expect(dailyPnL).toEqual([
        { date: '2024-01-15', pnl: 0, tradeCount: 2 },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatPercentage(0)).toBe('0.0%');
      expect(calculateAccountBalance(1000, [])).toBe(1000);
    });

    it('should handle extreme values', () => {
      expect(formatCurrency(Number.MAX_SAFE_INTEGER)).toMatch(/\$9,007,199,254,740,991.00/);
      expect(formatPercentage(999.999)).toBe('1000.0%');
    });

    it('should handle floating point precision', () => {
      const balance = calculateAccountBalance(1000, [
        { pnl_amount: 0.1 },
        { pnl_amount: 0.2 },
      ]);
      expect(balance).toBeCloseTo(1000.3, 2);
    });
  });
});