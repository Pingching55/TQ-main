import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dashboard analytics functions
export const calculateDashboardMetrics = (trades: Array<{ pnl_amount: number | null }>) => {
  const completedTrades = trades.filter(trade => trade.pnl_amount !== null);
  const totalTrades = completedTrades.length;
  
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      averagePnL: 0,
      bestTrade: 0,
      worstTrade: 0,
      profitFactor: 0,
    };
  }

  const winningTrades = completedTrades.filter(trade => (trade.pnl_amount || 0) > 0);
  const losingTrades = completedTrades.filter(trade => (trade.pnl_amount || 0) < 0);
  
  const totalPnL = completedTrades.reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0);
  const averagePnL = totalPnL / totalTrades;
  
  const pnlAmounts = completedTrades.map(trade => trade.pnl_amount || 0);
  const bestTrade = Math.max(...pnlAmounts);
  const worstTrade = Math.min(...pnlAmounts);
  
  const totalWins = winningTrades.reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl_amount || 0), 0));
  
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  const winRate = (winningTrades.length / totalTrades) * 100;

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    totalPnL,
    averagePnL,
    bestTrade,
    worstTrade,
    profitFactor,
  };
};

// Mock Dashboard Component
const MockDashboard = ({ trades }: { trades: Array<{ pnl_amount: number | null }> }) => {
  const metrics = calculateDashboardMetrics(trades);
  
  return (
    <div>
      <h1>Performance Dashboard</h1>
      <div data-testid="total-trades">Total Trades: {metrics.totalTrades}</div>
      <div data-testid="win-rate">Win Rate: {metrics.winRate.toFixed(1)}%</div>
      <div data-testid="total-pnl">Total P&L: ${metrics.totalPnL.toFixed(2)}</div>
      <div data-testid="profit-factor">Profit Factor: {metrics.profitFactor.toFixed(2)}</div>
      <div data-testid="best-trade">Best Trade: ${metrics.bestTrade.toFixed(2)}</div>
      <div data-testid="worst-trade">Worst Trade: ${metrics.worstTrade.toFixed(2)}</div>
    </div>
  );
};

describe('Dashboard Analytics Integration', () => {
  describe('Metrics Calculations', () => {
    it('should calculate metrics for profitable trading', () => {
      const trades = [
        { pnl_amount: 500 },   // Win
        { pnl_amount: -200 },  // Loss
        { pnl_amount: 300 },   // Win
        { pnl_amount: -100 },  // Loss
        { pnl_amount: 400 },   // Win
      ];
      
      render(<MockDashboard trades={trades} />);
      
      expect(screen.getByTestId('total-trades')).toHaveTextContent('Total Trades: 5');
      expect(screen.getByTestId('win-rate')).toHaveTextContent('Win Rate: 60.0%');
      expect(screen.getByTestId('total-pnl')).toHaveTextContent('Total P&L: $900.00');
      expect(screen.getByTestId('best-trade')).toHaveTextContent('Best Trade: $500.00');
      expect(screen.getByTestId('worst-trade')).toHaveTextContent('Worst Trade: $-200.00');
    });

    it('should handle empty trades array', () => {
      render(<MockDashboard trades={[]} />);
      
      expect(screen.getByTestId('total-trades')).toHaveTextContent('Total Trades: 0');
      expect(screen.getByTestId('win-rate')).toHaveTextContent('Win Rate: 0.0%');
      expect(screen.getByTestId('total-pnl')).toHaveTextContent('Total P&L: $0.00');
    });

    it('should ignore incomplete trades', () => {
      const trades = [
        { pnl_amount: 500 },   // Complete trade
        { pnl_amount: null },  // Incomplete trade
        { pnl_amount: -200 },  // Complete trade
      ];
      
      render(<MockDashboard trades={trades} />);
      
      expect(screen.getByTestId('total-trades')).toHaveTextContent('Total Trades: 2');
      expect(screen.getByTestId('win-rate')).toHaveTextContent('Win Rate: 50.0%');
    });

    it('should calculate profit factor correctly', () => {
      const trades = [
        { pnl_amount: 600 },   // Win
        { pnl_amount: 400 },   // Win
        { pnl_amount: -200 },  // Loss
        { pnl_amount: -100 },  // Loss
      ];
      
      render(<MockDashboard trades={trades} />);
      
      // Profit Factor = Total Wins / Total Losses = 1000 / 300 = 3.33
      expect(screen.getByTestId('profit-factor')).toHaveTextContent('Profit Factor: 3.33');
    });

    it('should handle infinite profit factor (no losses)', () => {
      const trades = [
        { pnl_amount: 500 },
        { pnl_amount: 300 },
      ];
      
      render(<MockDashboard trades={trades} />);
      
      expect(screen.getByTestId('profit-factor')).toHaveTextContent('Profit Factor: 999.00');
    });
  });

  describe('Real-time Updates', () => {
    it('should update metrics when new trade is added', () => {
      const initialTrades = [{ pnl_amount: 100 }];
      const { rerender } = render(<MockDashboard trades={initialTrades} />);
      
      expect(screen.getByTestId('total-trades')).toHaveTextContent('Total Trades: 1');
      
      // Add new trade
      const updatedTrades = [...initialTrades, { pnl_amount: 200 }];
      rerender(<MockDashboard trades={updatedTrades} />);
      
      expect(screen.getByTestId('total-trades')).toHaveTextContent('Total Trades: 2');
      expect(screen.getByTestId('total-pnl')).toHaveTextContent('Total P&L: $300.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all losing trades', () => {
      const trades = [
        { pnl_amount: -100 },
        { pnl_amount: -200 },
        { pnl_amount: -50 },
      ];
      
      render(<MockDashboard trades={trades} />);
      
      expect(screen.getByTestId('win-rate')).toHaveTextContent('Win Rate: 0.0%');
      expect(screen.getByTestId('profit-factor')).toHaveTextContent('Profit Factor: 0.00');
      expect(screen.getByTestId('total-pnl')).toHaveTextContent('Total P&L: $-350.00');
    });

    it('should handle breakeven trades', () => {
      const trades = [
        { pnl_amount: 0 },
        { pnl_amount: 0 },
      ];
      
      render(<MockDashboard trades={trades} />);
      
      expect(screen.getByTestId('total-pnl')).toHaveTextContent('Total P&L: $0.00');
      expect(screen.getByTestId('best-trade')).toHaveTextContent('Best Trade: $0.00');
      expect(screen.getByTestId('worst-trade')).toHaveTextContent('Worst Trade: $0.00');
    });
  });
});