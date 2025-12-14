import { describe, it, expect } from 'vitest';

// Data validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  // Username: 3-30 characters, alphanumeric + underscore
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

export const validateTradingPair = (pair: string): boolean => {
  // Trading pair: 6-8 uppercase characters (e.g., EURUSD, XAUUSD)
  const pairRegex = /^[A-Z]{6,8}$/;
  return pairRegex.test(pair);
};

export const validatePrice = (price: string): boolean => {
  const priceNum = parseFloat(price);
  return !isNaN(priceNum) && priceNum > 0;
};

export const validatePnL = (pnl: string): boolean => {
  if (pnl.trim() === '') return true; // Optional field
  const pnlNum = parseFloat(pnl);
  return !isNaN(pnlNum);
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Basic phone validation: optional +, then digits, spaces, hyphens, parentheses
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

describe('Data Validation', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('trader123@trading-platform.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('Username Validation', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('trader123')).toBe(true);
      expect(validateUsername('user_name')).toBe(true);
      expect(validateUsername('TradingPro')).toBe(true);
      expect(validateUsername('a'.repeat(30))).toBe(true); // Max length
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false); // Too short
      expect(validateUsername('a'.repeat(31))).toBe(false); // Too long
      expect(validateUsername('user-name')).toBe(false); // Hyphen not allowed
      expect(validateUsername('user name')).toBe(false); // Space not allowed
      expect(validateUsername('user@name')).toBe(false); // Special chars not allowed
      expect(validateUsername('')).toBe(false); // Empty
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

  describe('Price Validation', () => {
    it('should validate correct prices', () => {
      expect(validatePrice('1.0850')).toBe(true);
      expect(validatePrice('1000')).toBe(true);
      expect(validatePrice('0.00001')).toBe(true);
      expect(validatePrice('1234.56789')).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(validatePrice('0')).toBe(false); // Zero not allowed
      expect(validatePrice('-100')).toBe(false); // Negative not allowed
      expect(validatePrice('abc')).toBe(false); // Not a number
      expect(validatePrice('')).toBe(false); // Empty
      expect(validatePrice('1.2.3')).toBe(false); // Invalid format
    });
  });

  describe('P&L Validation', () => {
    it('should validate correct P&L values', () => {
      expect(validatePnL('100.50')).toBe(true);
      expect(validatePnL('-75.25')).toBe(true);
      expect(validatePnL('0')).toBe(true);
      expect(validatePnL('')).toBe(true); // Optional field
    });

    it('should reject invalid P&L values', () => {
      expect(validatePnL('abc')).toBe(false);
      expect(validatePnL('1.2.3')).toBe(false);
      expect(validatePnL('$100')).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone formats', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('(555) 123-4567')).toBe(true);
      expect(validatePhoneNumber('555-123-4567')).toBe(true);
      expect(validatePhoneNumber('5551234567')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(validatePhoneNumber('123')).toBe(false); // Too short
      expect(validatePhoneNumber('12345678901234567890')).toBe(false); // Too long
      expect(validatePhoneNumber('abc-def-ghij')).toBe(false); // Letters
      expect(validatePhoneNumber('')).toBe(false); // Empty
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize dangerous input', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('  Normal text  ')).toBe('Normal text');
      expect(sanitizeInput('Text with > and < symbols')).toBe('Text with  and  symbols');
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(-500.75)).toBe('-$500.75');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });
});