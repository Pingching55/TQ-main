import { describe, it, expect } from 'vitest';

// Trading calculation utilities - these are the actual functions we're testing
export const calculatePnL = (
  position: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  lotSize: number = 1
): number => {
  const priceMovement = exitPrice - entryPrice;
  const pnl = position === 'Long' ? priceMovement : -priceMovement;
  return pnl * lotSize;
};

export const calculateWinRate = (trades: Array<{ pnl_amount: number | null }>): number => {
  const completedTrades = trades.filter(trade => trade.pnl_amount !== null);
  if (completedTrades.length === 0) return 0;
  
  const winningTrades = completedTrades.filter(trade => (trade.pnl_amount || 0) > 0);
  return (winningTrades.length / completedTrades.length) * 100;
};

export const calculateProfitFactor = (trades: Array<{ pnl_amount: number | null }>): number => {
  const completedTrades = trades.filter(trade => trade.pnl_amount !== null);
  
  const totalWins = completedTrades
    .filter(trade => (trade.pnl_amount || 0) > 0)
    .reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0);
    
  const totalLosses = Math.abs(
    completedTrades
      .filter(trade => (trade.pnl_amount || 0) < 0)
      .reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0)
  );
  
  if (totalLosses === 0) return totalWins > 0 ? 999 : 0;
  return totalWins / totalLosses;
};

export const calculateSharpeRatio = (trades: Array<{ pnl_amount: number | null }>): number => {
  const completedTrades = trades.filter(trade => trade.pnl_amount !== null);
  if (completedTrades.length <= 1) return 0;
  
  const returns = completedTrades.map(trade => trade.pnl_amount || 0);
  const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / (returns.length - 1);
  const standardDeviation = Math.sqrt(variance);
  
  if (standardDeviation === 0) return 0;
  return (meanReturn / standardDeviation) * Math.sqrt(252); // Annualized
};

describe('Trading Calculations', () => {
  describe('P&L Calculations', () => {
    it('should calculate Long position P&L correctly', () => {
      const pnl = calculatePnL('Long', 1.0850, 1.0900, 1);
      expect(pnl).toBeCloseTo(0.0050, 4);
    });

    it('should calculate Short position P&L correctly', () => {
      const pnl = calculatePnL('Short', 1.0850, 1.0800, 1);
      expect(pnl).toBeCloseTo(0.0050, 4);
    });

    it('should handle losing Long position', () => {
      const pnl = calculatePnL('Long', 1.0900, 1.0850, 1);
      expect(pnl).toBeCloseTo(-0.0050, 4);
    });

    it('should handle losing Short position', () => {
      const pnl = calculatePnL('Short', 1.0800, 1.0850, 1);
      expect(pnl).toBeCloseTo(-0.0050, 4);
    });
  }); // ← This closing brace was missing!

  describe('Win Rate Calculations', () => {
    it('should calculate win rate correctly', () => {
      const trades = [
        { pnl_amount: 100 },
        { pnl_amount: -50 },
        { pnl_amount: 200 },
        { pnl_amount: -75 },
        { pnl_amount: 150 },
      ];
      
      const winRate = calculateWinRate(trades);
      expect(winRate).toBe(60); // 3 wins out of 5 trades
    });

    it('should handle empty trades array', () => {
      const winRate = calculateWinRate([]);
      expect(winRate).toBe(0);
    });

    it('should ignore incomplete trades', () => {
      const trades = [
        { pnl_amount: 100 },
        { pnl_amount: null }, // Incomplete trade
        { pnl_amount: -50 },
      ];
      
      const winRate = calculateWinRate(trades);
      expect(winRate).toBe(50); // 1 win out of 2 completed trades
    });
  });

  describe('Profit Factor Calculations', () => {
    it('should calculate profit factor correctly', () => {
      const trades = [
        { pnl_amount: 200 }, // Win
        { pnl_amount: -100 }, // Loss
        { pnl_amount: 300 }, // Win
        { pnl_amount: -50 }, // Loss
      ];
      
      const profitFactor = calculateProfitFactor(trades);
      expect(profitFactor).toBe(500 / 150); // 3.33
    });

    it('should handle no losses (infinite profit factor)', () => {
      const trades = [
        { pnl_amount: 100 },
        { pnl_amount: 200 },
      ];
      
      const profitFactor = calculateProfitFactor(trades);
      expect(profitFactor).toBe(999); // Capped at 999
    });

    it('should handle no wins', () => {
      const trades = [
        { pnl_amount: -100 },
        { pnl_amount: -200 },
      ];
      
      const profitFactor = calculateProfitFactor(trades);
      expect(profitFactor).toBe(0);
    });
  });

  describe('Sharpe Ratio Calculations', () => {
    it('should calculate Sharpe ratio for profitable trading', () => {
      const trades = [
        { pnl_amount: 100 },
        { pnl_amount: 150 },
        { pnl_amount: -50 },
        { pnl_amount: 200 },
        { pnl_amount: -25 },
      ];
      
      const sharpeRatio = calculateSharpeRatio(trades);
      expect(sharpeRatio).toBeGreaterThan(0);
    });

    it('should handle insufficient data', () => {
      const trades = [{ pnl_amount: 100 }];
      const sharpeRatio = calculateSharpeRatio(trades);
      expect(sharpeRatio).toBe(0);
    });

    it('should handle zero standard deviation', () => {
      const trades = [
        { pnl_amount: 100 },
        { pnl_amount: 100 },
        { pnl_amount: 100 },
      ];
      
      const sharpeRatio = calculateSharpeRatio(trades);
      expect(sharpeRatio).toBe(0);
    });
  });
});
