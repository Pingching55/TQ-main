"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Trade {
  id: string;
  date: string;
  pair: string;
  pnl_amount: number | null;
}

interface ActivityGridProps {
  trades: Trade[];
}

export function ActivityGrid({ trades }: ActivityGridProps) {
  const recentTrades = useMemo(() => {
    const sortedTrades = [...trades]
      .filter(t => t.pnl_amount !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 28);

    return sortedTrades.map(trade => ({
      id: trade.id,
      date: trade.date,
      pair: trade.pair,
      status: trade.pnl_amount! > 0 ? 'win' : trade.pnl_amount! < 0 ? 'loss' : 'neutral',
      pnl: trade.pnl_amount!
    }));
  }, [trades]);

  const getColorClass = (status: string) => {
    if (status === 'win') return 'activity-win';
    if (status === 'loss') return 'activity-loss';
    return 'activity-neutral';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPnL = (pnl: number) => {
    return `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
  };

  return (
    <Card className="activity-grid-card">
      <CardHeader className="activity-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <CardTitle className="activity-card-title">Recent Trades</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="activity-card-content">
        <TooltipProvider>
          <div className="activity-grid-container">
            {recentTrades.map((trade, index) => (
              <Tooltip key={trade.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className={`activity-square ${getColorClass(trade.status)}`} />
                </TooltipTrigger>
                <TooltipContent side="top" className="activity-tooltip">
                  <div className="activity-tooltip-content">
                    <div className="activity-tooltip-pair">{trade.pair}</div>
                    <div className="activity-tooltip-date">{formatDate(trade.date)}</div>
                    <div className={`activity-tooltip-pnl ${trade.status}`}>
                      {formatPnL(trade.pnl)}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
