"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import '../account/account.css';
import './dashboard.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityGrid } from '@/components/ui/activity-grid';
import { WinRateCircle } from '@/components/ui/win-rate-circle';
import { StreakIndicator } from '@/components/ui/streak-indicator';
import { BookOpen, LogOut, Moon, Sun, User, TrendingUp, TrendingDown, Target, DollarSign, BarChart3, PieChart, Calendar, Award, Newspaper, Users } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import { MobileNav } from '@/components/ui/mobile-nav';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Trade {
  id: string;
  date: string;
  pair: string;
  position: 'Long' | 'Short';
  entry_price: number;
  exit_price: number | null;
  pnl_amount: number | null;
  notes: string;
  trading_account_id: string;
}

interface TradingAccount {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
}

interface UserProfile {
  username: string;
}

interface DashboardMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  averagePnL: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  sharpeRatio: number;
}

interface ChartDataPoint {
  date: string;
  balance: number;
  pnl: number | null;
  cumulativePnL: number;
}

interface DailyPnL {
  date: string;
  pnl: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isLoaded } = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [dailyPnL, setDailyPnL] = useState<DailyPnL[]>([]);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return (
      <div className="loading-container theme-dark">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const savedAccount = localStorage.getItem('selectedTradingAccount');
    if (savedAccount && accounts.length > 0) {
      const accountExists = accounts.find(acc => acc.id === savedAccount);
      if (accountExists) {
        setSelectedAccount(savedAccount);
        loadTrades(savedAccount);
      } else {
        if (accounts.length > 0) {
          const firstAccountId = accounts[0].id;
          setSelectedAccount(firstAccountId);
          localStorage.setItem('selectedTradingAccount', firstAccountId);
          loadTrades(firstAccountId);
        }
      }
    } else if (accounts.length > 0 && !selectedAccount) {
      const firstAccountId = accounts[0].id;
      setSelectedAccount(firstAccountId);
      localStorage.setItem('selectedTradingAccount', firstAccountId);
      loadTrades(firstAccountId);
    }
  }, [accounts]);

  useEffect(() => {
    if (trades.length > 0 && selectedAccount) {
      calculateMetrics();
      generateChartData();
      calculateDailyPnL();
    }
  }, [trades, selectedAccount, timeframe]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Error loading profile');
        setLoading(false);
        return;
      }

      setUserProfile(profile);

      const { data: accountsData, error: accountsError } = await supabase
        .from('trading_accounts')
        .select('id, name, initial_balance, current_balance')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('Error loading trading accounts:', accountsError);
      } else {
        setAccounts(accountsData || []);
      }

      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const loadTrades = async (accountId: string) => {
    try {
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('trading_account_id', accountId)
        .order('date', { ascending: true });

      if (tradesError) {
        console.error('Error loading trades:', tradesError);
      } else {
        setTrades(tradesData || []);
      }
    } catch (err) {
      console.error('Error loading trades:', err);
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    localStorage.setItem('selectedTradingAccount', accountId);
    loadTrades(accountId);
  };

  const calculateMetrics = () => {
    if (trades.length === 0) {
      setMetrics(null);
      return;
    }

    const completedTrades = trades.filter(trade => trade.pnl_amount !== null);
    const totalTrades = completedTrades.length;
    
    if (totalTrades === 0) {
      setMetrics({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        averagePnL: 0,
        bestTrade: 0,
        worstTrade: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        sharpeRatio: 0,
      });
      return;
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
    
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    const winRate = (winningTrades.length / totalTrades) * 100;

    // Calculate Sharpe Ratio
    // Sharpe Ratio = (Average Return - Risk-free Rate) / Standard Deviation of Returns
    // For simplicity, we'll use 0% risk-free rate and calculate based on daily returns
    let sharpeRatio = 0;
    if (totalTrades > 1) {
      const returns = completedTrades.map(trade => trade.pnl_amount || 0);
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      
      // Calculate standard deviation
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / (returns.length - 1);
      const standardDeviation = Math.sqrt(variance);
      
      // Calculate Sharpe ratio (annualized approximation)
      if (standardDeviation > 0) {
        sharpeRatio = (meanReturn / standardDeviation) * Math.sqrt(252); // 252 trading days per year
      }
    }
    setMetrics({
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalPnL,
      averagePnL,
      bestTrade,
      worstTrade,
      profitFactor,
      averageWin,
      averageLoss,
      sharpeRatio,
    });
  };

  const generateChartData = () => {
    if (trades.length === 0 || !selectedAccount) {
      setChartData([]);
      return;
    }

    const account = accounts.find(acc => acc.id === selectedAccount);
    if (!account) return;

    const initialBalance = account.initial_balance;
    let cumulativePnL = 0;
    
    // Filter trades based on timeframe
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeframe) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        cutoffDate.setFullYear(2000); // Far in the past
        break;
    }

    const filteredTrades = trades.filter(trade => new Date(trade.date) >= cutoffDate);
    
    // Start with initial balance - use a more recent starting point if we have trades
    const data: ChartDataPoint[] = [];
    
    // If we have trades, start from a bit before the first trade
    if (filteredTrades.length > 0) {
      const firstTradeDate = new Date(filteredTrades[0].date);
      const startDate = new Date(firstTradeDate);
      startDate.setDate(startDate.getDate() - 1); // Start 1 day before first trade
      
      data.push({
        date: startDate.toISOString().split('T')[0],
        balance: initialBalance,
        pnl: null,
        cumulativePnL: 0
      });
    } else {
      // No trades, just show initial balance
      data.push({
        date: cutoffDate.toISOString().split('T')[0],
        balance: initialBalance,
        pnl: null,
        cumulativePnL: 0
      });
    }

    // Add data points for each trade
    filteredTrades.forEach(trade => {
      if (trade.pnl_amount !== null) {
        cumulativePnL += trade.pnl_amount;
        data.push({
          date: trade.date,
          balance: initialBalance + cumulativePnL,
          pnl: trade.pnl_amount,
          cumulativePnL
        });
      }
    });

    setChartData(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };


  const getPnLClass = (pnlAmount: number) => {
    return pnlAmount >= 0 ? 'profit' : 'loss';
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.id === selectedAccount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculateDailyPnL = () => {
    if (trades.length === 0) {
      setDailyPnL([]);
      return;
    }

    const dailyTotals: { [date: string]: number } = {};
    
    trades.forEach(trade => {
      if (trade.pnl_amount !== null) {
        const date = trade.date;
        if (!dailyTotals[date]) {
          dailyTotals[date] = 0;
        }
        dailyTotals[date] += trade.pnl_amount;
      }
    });

    const dailyPnLData: DailyPnL[] = Object.entries(dailyTotals).map(([date, pnl]) => ({
      date,
      pnl
    }));

    setDailyPnL(dailyPnLData);
  };

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const getDayPnL = (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dailyPnL.find(d => d.date === dateStr);
      return dayData ? dayData.pnl : null;
    };
    
    const getDayTrades = (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return trades.filter(trade => trade.date === dateStr && trade.pnl_amount !== null).length;
    };
    
    const formatPnL = (amount: number) => {
      const absAmount = Math.abs(amount);
      if (absAmount >= 1000) {
        return `${amount >= 0 ? '$' : '-$'}${(absAmount / 1000).toFixed(1)}k`;
      } else if (absAmount >= 100) {
        return `${amount >= 0 ? '$' : '-$'}${absAmount.toFixed(0)}`;
      } else {
        return `${amount >= 0 ? '$' : '-$'}${absAmount.toFixed(0)}`;
      }
    };
    
    const goToPreviousMonth = () => {
      setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
    };
    
    const goToNextMonth = () => {
      setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
    };
    
    const isToday = (day: number) => {
      return today.getDate() === day && 
             today.getMonth() === currentMonth && 
             today.getFullYear() === currentYear;
    };
    
    const renderCalendarDays = () => {
      const days = [];
      
      // Empty cells for days before the first day of the month
      for (let i = 0; i < firstDayWeekday; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
      }
      
      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const pnl = getDayPnL(day);
        const dayTradesCount = getDayTrades(day);
        
        const dayClass = `calendar-day ${
          pnl !== null 
            ? pnl > 0 
              ? 'profit' 
              : pnl < 0 
                ? 'loss' 
                : 'breakeven'
            : ''
        } ${isToday(day) ? 'today' : ''}`;
        
        days.push(
          <div key={day} className={dayClass}>
            <div className="calendar-day-number">{day}</div>
            <div className="calendar-day-content">
              {pnl !== null && (
                <div className="calendar-day-pnl">
                  {formatPnL(pnl)}
                </div>
              )}
              {dayTradesCount > 0 && (
                <div className="calendar-day-trades">
                  {dayTradesCount} trade{dayTradesCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        );
      }
      
      return days;
    };
    
    return (
      <Card className="chart-card">
        <CardHeader>
          <CardTitle className="chart-title">Trading Calendar</CardTitle>
          <CardDescription>Daily P&L overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="trading-calendar">
            <div className="calendar-header">
              <button onClick={goToPreviousMonth} className="calendar-nav-btn">
                ‹
              </button>
              <div className="calendar-month-year">
                {monthNames[currentMonth]} {currentYear}
              </div>
              <button onClick={goToNextMonth} className="calendar-nav-btn">
                ›
              </button>
            </div>
            
            <div className="calendar-container">
              <div className="calendar-grid">
                {/* Weekday headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
                
                {/* Calendar days */}
                {renderCalendarDays()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <p className="error-text">Error loading profile</p>
          <Button onClick={() => router.push('/auth/login')} className="btn-primary mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`account-page ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* Top Navigation */}
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="nav-content">
            {/* Logo */}
            <div className="nav-logo">
              <h1>TradeQuest</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button className="nav-tab active">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => router.push('/journal')}
                className="nav-tab"
              >
                <BookOpen className="w-4 h-4" />
                Journal
              </button>
              <button
                onClick={() => router.push('/news')}
                className="nav-tab"
              >
                <Newspaper className="w-4 h-4" />
                News
              </button>
              <button
                onClick={() => router.push('/community')}
                className="nav-tab"
              >
                <Users className="w-4 h-4" />
                Community
              </button>
              <button
                onClick={() => router.push('/teams')}
                className="nav-tab"
              >
                <Users className="w-4 h-4" />
                Teams
              </button>
              <button
                onClick={() => router.push('/account')}
                className="nav-tab"
              >
                <User className="w-4 h-4" />
                Account
              </button>
            </div>

            {/* Right side */}
            <div className="nav-actions">
              <span className="nav-username">{userProfile.username}</span>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut className="w-4 h-4" />
                Logout
              </button>

              {/* Mobile Navigation */}
              <MobileNav
                logo={<h1 style={{ color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>TradeQuest</h1>}
                actions={
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{userProfile.username}</span>
                    </div>
                    <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', justifyContent: 'center' }}>
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                }
              >
                <div className="mobile-nav-items">
                  <button className="mobile-nav-item active">
                    <BarChart3 />
                    Dashboard
                  </button>
                  <button onClick={() => router.push('/journal')} className="mobile-nav-item">
                    <BookOpen />
                    Journal
                  </button>
                  <button onClick={() => router.push('/news')} className="mobile-nav-item">
                    <Newspaper />
                    News
                  </button>
                  <button onClick={() => router.push('/community')} className="mobile-nav-item">
                    <Users />
                    Community
                  </button>
                  <button onClick={() => router.push('/teams')} className="mobile-nav-item">
                    <Users />
                    Teams
                  </button>
                  <button onClick={() => router.push('/account')} className="mobile-nav-item">
                    <User />
                    Account
                  </button>
                </div>
              </MobileNav>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Performance Dashboard</h1>
            <p className="dashboard-subtitle">Track your trading performance and analytics</p>
          </div>
          
          <div className="dashboard-controls">
            {accounts.length > 0 && (
              <Select value={selectedAccount} onValueChange={handleAccountChange}>
                <SelectTrigger className="account-selector">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={timeframe} onValueChange={(value: '7d' | '30d' | '90d' | 'all') => setTimeframe(value)}>
              <SelectTrigger className="timeframe-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="empty-state">
            <BarChart3 className="empty-icon" />
            <p>No trading accounts found</p>
            <p className="empty-subtitle">Create a trading account first to view your dashboard</p>
            <Button onClick={() => router.push('/account')} className="btn-primary">
              Go to Account
            </Button>
          </div>
        ) : !selectedAccount ? (
          <div className="empty-state">
            <BarChart3 className="empty-icon" />
            <p>Select an account to view dashboard</p>
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="metrics-grid">
              <Card className="metric-card balance-card">
                <CardHeader className="metric-header">
                  <CardTitle className="metric-title">
                    <DollarSign className="metric-icon" />
                    Current Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="metric-value balance-value">
                    {formatCurrency(getSelectedAccount()?.current_balance || 0)}
                  </div>
                  <div className="metric-change">
                    {metrics && (
                      <span className={metrics.totalPnL >= 0 ? 'positive' : 'negative'}>
                        {metrics.totalPnL >= 0 ? '+' : ''}{formatCurrency(metrics.totalPnL)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="metric-card">
                <CardHeader className="metric-header">
                  <CardTitle className="metric-title">
                    <Target className="metric-icon" />
                    Win Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="metric-value">
                    {metrics ? formatPercentage(metrics.winRate) : '0%'}
                  </div>
                  <div className="metric-subtitle">
                    {metrics ? `${metrics.winningTrades}W / ${metrics.losingTrades}L` : '0W / 0L'}
                  </div>
                </CardContent>
              </Card>

              <Card className="metric-card">
                <CardHeader className="metric-header">
                  <CardTitle className="metric-title">
                    <BarChart3 className="metric-icon" />
                    Total Trades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="metric-value">
                    {metrics?.totalTrades || 0}
                  </div>
                  <div className="metric-subtitle">Completed trades</div>
                </CardContent>
              </Card>

              <Card className="metric-card">
                <CardHeader className="metric-header">
                  <CardTitle className="metric-title">
                    <TrendingUp className="metric-icon" />
                    Average P&L
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="metric-value">
                    {metrics ? formatCurrency(metrics.averagePnL) : '$0.00'}
                  </div>
                  <div className="metric-subtitle">Per trade</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Dashboard Layout with Balance Chart and Activity */}
            <div className="dashboard-main-section">
              {/* Balance Chart - Left Side */}
              <Card className="chart-card balance-chart">
                <CardHeader>
                  <CardTitle className="chart-title">Account Balance Over Time</CardTitle>
                  <CardDescription>Track your account balance progression</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis
                          dataKey="date"
                          stroke="var(--text-muted)"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="var(--text-muted)"
                          fontSize={12}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                          domain={['dataMin - 1000', 'dataMax + 1000']}
                          scale="linear"
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)'
                          }}
                          formatter={(value: any, name: string) => [
                            name === 'balance' ? formatCurrency(value) : value,
                            name === 'balance' ? 'Balance' : 'P&L'
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 3 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Right Side - Activity Grid and Win Rate stacked */}
              <div className="dashboard-right-section">
                <div className="activity-grid-wrapper">
                  <ActivityGrid trades={trades} />
                  <div className="activity-grid-header-streak">
                    <StreakIndicator trades={trades} compact />
                  </div>
                </div>
                <WinRateCircle
                  winRate={metrics?.winRate || 0}
                  winningTrades={metrics?.winningTrades || 0}
                  losingTrades={metrics?.losingTrades || 0}
                />
              </div>
            </div>

            {/* Trading Calendar */}
            <div className="charts-section">
              {renderCalendar()}
            </div>

            {/* Additional Metrics Row */}
            <div className="charts-section">
              <div className="additional-metrics" style={{ gridColumn: 'span 2' }}>
                <Card className="metric-detail-card">
                  <CardHeader>
                    <CardTitle className="chart-title">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="metrics-list">
                      <div className="metric-row">
                        <span className="metric-label">Best Trade</span>
                        <span className="metric-value-small positive">
                          {metrics ? formatCurrency(metrics.bestTrade) : '$0.00'}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Worst Trade</span>
                        <span className="metric-value-small negative">
                          {metrics ? formatCurrency(metrics.worstTrade) : '$0.00'}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Average Win</span>
                        <span className="metric-value-small positive">
                          {metrics ? formatCurrency(metrics.averageWin) : '$0.00'}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Average Loss</span>
                        <span className="metric-value-small negative">
                          -{metrics ? formatCurrency(metrics.averageLoss) : '$0.00'}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Profit Factor</span>
                        <span className="metric-value-small">
                          {metrics ? metrics.profitFactor.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Sharpe Ratio</span>
                        <span className={`metric-value-small ${metrics && metrics.sharpeRatio >= 1 ? 'positive' : metrics && metrics.sharpeRatio >= 0 ? '' : 'negative'}`}>
                          {metrics ? metrics.sharpeRatio.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Total P&L</span>
                        <span className={`metric-value-small ${metrics && metrics.totalPnL >= 0 ? 'positive' : 'negative'}`}>
                          {metrics ? formatCurrency(metrics.totalPnL) : '$0.00'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}