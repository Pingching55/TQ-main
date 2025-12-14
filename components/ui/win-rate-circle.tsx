"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WinRateCircleProps {
  winRate: number;
  winningTrades: number;
  losingTrades: number;
}

export function WinRateCircle({ winRate, winningTrades, losingTrades }: WinRateCircleProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (winRate / 100) * circumference;

  return (
    <Card className="win-rate-circle-card">
      <CardHeader className="activity-card-header">
        <CardTitle className="activity-card-title">Win Rate</CardTitle>
      </CardHeader>
      <CardContent className="activity-card-content">
        <div className="win-rate-circle-container">
          <svg className="win-rate-svg" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="12"
            />

            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="url(#winRateGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              className="win-rate-progress"
            />

            <text
              x="70"
              y="65"
              textAnchor="middle"
              className="win-rate-percentage"
              fill="white"
              fontSize="24"
              fontWeight="700"
            >
              {winRate.toFixed(1)}%
            </text>
            <text
              x="70"
              y="82"
              textAnchor="middle"
              className="win-rate-label"
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="10"
              fontWeight="500"
            >
              WIN RATE
            </text>
          </svg>

          <div className="win-rate-stats">
            <div className="win-rate-stat-item">
              <div className="win-rate-stat-value win">{winningTrades}</div>
              <div className="win-rate-stat-label">Wins</div>
            </div>
            <div className="win-rate-stat-divider" />
            <div className="win-rate-stat-item">
              <div className="win-rate-stat-value loss">{losingTrades}</div>
              <div className="win-rate-stat-label">Losses</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
