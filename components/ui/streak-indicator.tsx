"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Trade {
  id: string;
  date: string;
  pnl_amount: number | null;
}

interface StreakIndicatorProps {
  trades: Trade[];
  compact?: boolean;
}

export function StreakIndicator({ trades, compact = false }: StreakIndicatorProps) {
  const streakData = useMemo(() => {
    const completedTrades = trades
      .filter(t => t.pnl_amount !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (completedTrades.length === 0) {
      return { count: 0, type: 'none', amount: 0 };
    }

    const firstTrade = completedTrades[0];
    const firstTradeType = firstTrade.pnl_amount! > 0 ? 'win' : 'loss';

    let streakCount = 0;
    let streakAmount = 0;

    for (const trade of completedTrades) {
      const tradeType = trade.pnl_amount! > 0 ? 'win' : 'loss';

      if (tradeType === firstTradeType) {
        streakCount++;
        streakAmount += trade.pnl_amount!;
      } else {
        break;
      }
    }

    return {
      count: streakCount,
      type: firstTradeType,
      amount: streakAmount
    };
  }, [trades]);

  const formatAmount = (amount: number) => {
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const getStreakText = (count: number, type: string, amount: number) => {
    const letter = type === 'win' ? 'W' : 'L';
    const amountFormatted = formatAmount(amount);

    if (count === 1) {
      return `1 ${letter} ${amountFormatted}`;
    } else {
      return `${count} ${letter} streaks ${amountFormatted}`;
    }
  };

  if (streakData.count === 0) {
    if (compact) {
      return (
        <div className="streak-indicator-compact streak-neutral">
          <div className="streak-compact-content">
            <span className="streak-compact-text">No streak</span>
          </div>
        </div>
      );
    }

    return (
      <Card className="streak-indicator-card">
        <CardHeader className="activity-card-header">
          <CardTitle className="activity-card-title">Current Streak</CardTitle>
        </CardHeader>
        <CardContent className="activity-card-content">
          <div className="streak-content">
            <div className="streak-count">0</div>
            <div className="streak-label">No trades yet</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isWinStreak = streakData.type === 'win';

  if (compact) {
    return (
      <div className={`streak-indicator-compact ${isWinStreak ? 'streak-win-compact' : 'streak-loss-compact'}`}>
        <div className="streak-compact-content">
          <span className="streak-compact-label">Current streak:</span>
          <span className="streak-compact-text">
            {getStreakText(streakData.count, streakData.type, streakData.amount)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={`streak-indicator-card ${isWinStreak ? 'streak-win' : 'streak-loss'}`}>
      <CardHeader className="activity-card-header">
        <CardTitle className="activity-card-title">Current Streak</CardTitle>
      </CardHeader>
      <CardContent className="activity-card-content">
        <div className="streak-content">
          <div className="streak-icon">
            {isWinStreak ? (
              <TrendingUp className="w-8 h-8" />
            ) : (
              <TrendingDown className="w-8 h-8" />
            )}
          </div>
          <div className="streak-info">
            <div className="streak-count">
              {streakData.count} {isWinStreak ? 'Win' : 'Loss'}{streakData.count !== 1 ? 's' : ''}
            </div>
            <div className="streak-amount">
              {formatAmount(streakData.amount)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
