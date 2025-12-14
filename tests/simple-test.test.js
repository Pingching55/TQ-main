import { describe, it, expect } from 'vitest';

// Simple function tests
function addNumbers(a, b) {
  return a + b;
}

function calculatePnL(position, entryPrice, exitPrice) {
  const priceMovement = exitPrice - entryPrice;
  return position === 'Long' ? priceMovement : -priceMovement;
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

describe('Simple Trading Tests', () => {
  it('should add two numbers', () => {
    expect(addNumbers(2, 3)).toBe(5);
  });

  it('should calculate Long position profit', () => {
    const pnl = calculatePnL('Long', 1.0850, 1.0900);
    expect(pnl).toBe(0.0050);
  });

  it('should calculate Short position profit', () => {
    const pnl = calculatePnL('Short', 1.0900, 1.0850);
    expect(pnl).toBe(0.0050);
  });

  it('should format currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1234.56');
    expect(formatCurrency(-500.75)).toBe('$-500.75');
  });
});