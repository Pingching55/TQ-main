"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import '../account/account.css';
import './news.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus, Globe, TrendingUp, Bitcoin, BarChart3, BookOpen, Newspaper, User, Sun, Moon, LogOut, Calendar, Search, ExternalLink, Users } from 'lucide-react';
import { MobileNav } from '@/components/ui/mobile-nav';
import { supabase } from '@/lib/supabase';
import { analyzeFinancialSentiment, formatSentimentScore, getSentimentIcon, SentimentResult } from '@/lib/sentiment';
import { useRouter } from 'next/navigation';

interface NewsArticle {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  banner_image?: string;
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: Array<{
    topic: string;
    relevance_score: string;
  }>;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment?: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }>;
  // Add VADER sentiment analysis
  vader_sentiment?: SentimentResult;
}

interface UserProfile {
  username: string;
}

type NewsCategory = 'general' | 'markets' | 'crypto';

const NEWS_CATEGORIES = {
  general: { label: 'General Finance', icon: Globe, topics: 'finance' },
  markets: { label: 'Financial Markets', icon: TrendingUp, topics: 'financial_markets' },
  crypto: { label: 'Cryptocurrency', icon: Bitcoin, topics: 'blockchain' }
};

export default function NewsPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, isLoaded } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('markets');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    if (userProfile) {
      fetchNews();
    }
  }, [selectedCategory, userProfile]);

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
      setLoading(false);
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    setError('');

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
      
      if (!apiKey) {
        setError('Alpha Vantage API key is not configured. News features will be limited.');
        setNewsLoading(false);
        return;
      }

      console.log('Using API Key:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));
      console.log('Selected category:', selectedCategory);
      
      const category = NEWS_CATEGORIES[selectedCategory];
      const topics = category.topics;
      
      // Alpha Vantage News & Sentiment API
      const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&apikey=${apiKey}&limit=50&sort=LATEST`;
      
      console.log('API URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));
      
      const response = await fetch(url);
      const data = await response.json();

      console.log('API Response:', data);

      if (data.Note) {
        setError(`API rate limit reached: ${data.Note}. Please try again in a minute.`);
        setNewsLoading(false);
        return;
      }

      if (data.Information) {
        setError(`API Error: ${data.Information}. Please check your Alpha Vantage API key.`);
        setNewsLoading(false);
        return;
      }

      if (data['Error Message']) {
        setError(`API Error: ${data['Error Message']}. Please check your Alpha Vantage API key.`);
        setNewsLoading(false);
        return;
      }

      if (data.feed && Array.isArray(data.feed)) {
        // Enhance articles with VADER sentiment analysis
        const enhancedArticles = data.feed.map((article: NewsArticle) => ({
          ...article,
          vader_sentiment: analyzeFinancialSentiment(article.title, article.summary)
        }));
        
        setArticles(enhancedArticles);
        setLastUpdated(new Date());
        console.log(`Loaded ${enhancedArticles.length} articles for ${selectedCategory}`);
        console.log('Sample article with VADER sentiment:', enhancedArticles[0]); // Debug log
      } else {
        console.log('Full API Response:', data);
        if (data.Information) {
          setError(`API Error: ${data.Information}`);
        } else if (data.Note) {
          setError(`API Rate Limit: ${data.Note}`);
        } else {
          setError(`No news data available for ${selectedCategory}. Check console for API response.`);
        }
      }

    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news. Please try again.');
    }

    setNewsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    try {
      // Alpha Vantage format: YYYYMMDDTHHMMSS
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      const hour = dateString.substring(9, 11);
      const minute = dateString.substring(11, 13);
      
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const renderSentimentIcon = (sentiment: SentimentResult) => {
    if (sentiment.color === 'positive') {
      return <ArrowUp className="w-4 h-4" />;
    } else if (sentiment.color === 'negative') {
      return <ArrowDown className="w-4 h-4" />;
    }
    return <Minus className="w-4 h-4" />;
  };

  const filteredArticles = articles.filter(article =>
    searchQuery === '' || 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`loading-container ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
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
              <button
                onClick={() => router.push('/dashboard')}
                className="nav-tab"
              >
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
              <button className="nav-tab active">
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
                  <button onClick={() => router.push('/dashboard')} className="mobile-nav-item">
                    <BarChart3 />
                    Dashboard
                  </button>
                  <button onClick={() => router.push('/journal')} className="mobile-nav-item">
                    <BookOpen />
                    Journal
                  </button>
                  <button className="mobile-nav-item active">
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

        {/* News Header */}
        <div className="news-header">
          <div>
            <h1 className="news-title">Market News & Analysis</h1>
            <p className="news-subtitle">Stay updated with the latest financial market news</p>
            {lastUpdated && (
              <p className="last-updated">
                <Calendar className="w-4 h-4" />
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="news-controls">
            <div className="search-container">
              <Search className="search-icon" />
              <Input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={(value: NewsCategory) => setSelectedCategory(value)}>
              <SelectTrigger className="category-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NEWS_CATEGORIES).map(([key, category]) => {
                  const IconComponent = category.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="category-option">
                        <IconComponent className="w-4 h-4" />
                        {category.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <Button onClick={fetchNews} disabled={newsLoading} className="refresh-btn">
              {newsLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-pills">
          {newsLoading ? (
            <div className="news-loading">
              <div className="loading-spinner"></div>
              <p>Loading latest news...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="empty-state">
              <Newspaper className="empty-icon" />
              <p>No news articles found</p>
              <p className="empty-subtitle">Try selecting a different category or refreshing</p>
              <Button onClick={fetchNews} className="btn-primary">
                Refresh News
              </Button>
            </div>
          ) : (
            <div className="articles-grid">
              {filteredArticles.map((article, index) => (
                <Card key={index} className="article-card">
                  <CardHeader className="article-header">
                    <div className="article-meta">
                      <Badge variant="outline" className="source-badge">
                        {article.source}
                      </Badge>
                      <span className="article-date">
                        {formatDate(article.time_published)}
                      </span>
                    </div>
                    <CardTitle className="article-title">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="article-link"
                      >
                        {article.title}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="article-content">
                    <p className="article-summary">{article.summary}</p>
                    
                    {article.authors && article.authors.length > 0 && (
                      <div className="article-authors">
                        <span className="authors-label">By:</span>
                        {article.authors.join(', ')}
                      </div>
                    )}
                    
                    <div className="article-footer">
                      <div className="sentiment-info">
                        {/* VADER Sentiment Analysis */}
                        {article.vader_sentiment && (
                          <div 
                            className={`sentiment-display sentiment-${article.vader_sentiment.color}`}
                          >
                            <div className="sentiment-icon">
                              {renderSentimentIcon(article.vader_sentiment)}
                            </div>
                            <div className="sentiment-details">
                              <span className="sentiment-label">{article.vader_sentiment.label}</span>
                              <span className="sentiment-score">
                                {formatSentimentScore(article.vader_sentiment.compound)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}