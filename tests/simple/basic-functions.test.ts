import { describe, it, expect } from 'vitest';

// Simple utility functions to test
function addNumbers(a: number, b: number): number {
  return a + b;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function validateTradingPair(pair: string): boolean {
  return /^[A-Z]{6,8}$/.test(pair);
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

describe('Basic Functions', () => {
  describe('Math Operations', () => {
    it('should add two numbers correctly', () => {
      expect(addNumbers(2, 3)).toBe(5);
      expect(addNumbers(-1, 1)).toBe(0);
      expect(addNumbers(0, 0)).toBe(0);
    });
  });

  describe('Currency Formatting', () => {
    it('should format positive amounts', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-500.75)).toBe('-$500.75');
    });
  });

  describe('Trading Pair Validation', () => {
    it('should validate correct trading pairs', () => {
      expect(validateTradingPair('EURUSD')).toBe(true);
      expect(validateTradingPair('GBPJPY')).toBe(true);
      expect(validateTradingPair('XAUUSD')).toBe(true);
    });

    it('should reject invalid trading pairs', () => {
      expect(validateTradingPair('eurusd')).toBe(false); // lowercase
      expect(validateTradingPair('EUR')).toBe(false); // too short
      expect(validateTradingPair('EURUSDGBP')).toBe(false); // too long
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate percentages correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculatePercentage(100, 0)).toBe(0); // division by zero
      expect(calculatePercentage(0, 0)).toBe(0);
    });
  });
});