import { describe, it, expect } from 'vitest';
import { analyzeSentiment, analyzeFinancialSentiment, formatSentimentScore, getSentimentIcon } from '@/lib/sentiment';

describe('Sentiment Analysis Module', () => {
  describe('Basic Sentiment Analysis', () => {
    it('should identify positive sentiment', () => {
      const result = analyzeSentiment('This is great news! Amazing profits and excellent growth!');
      
      expect(result.label).toBe('Bullish');
      expect(result.color).toBe('positive');
      expect(result.compound).toBeGreaterThan(0);
    });

    it('should identify negative sentiment', () => {
      const result = analyzeSentiment('Terrible losses, awful performance, very disappointing results');
      
      expect(result.label).toBe('Bearish');
      expect(result.color).toBe('negative');
      expect(result.compound).toBeLessThan(0);
    });

    it('should identify neutral sentiment', () => {
      const result = analyzeSentiment('The market opened today with regular trading activity');
      
      expect(result.label).toBe('Neutral');
      expect(result.color).toBe('neutral');
      expect(Math.abs(result.compound)).toBeLessThan(0.05);
    });

    it('should handle empty text', () => {
      const result = analyzeSentiment('');
      
      expect(result.label).toBe('Neutral');
      expect(result.compound).toBe(0);
    });
  });

  describe('Financial Sentiment Analysis', () => {
    it('should boost bullish financial keywords', () => {
      const title = 'Stock prices surge with record profits';
      const summary = 'Company reports strong growth and beat earnings expectations';
      
      const result = analyzeFinancialSentiment(title, summary);
      
      expect(result.label).toBe('Bullish');
      expect(result.compound).toBeGreaterThan(0.1);
    });

    it('should boost bearish financial keywords', () => {
      const title = 'Market crash leads to massive losses';
      const summary = 'Investors face significant declines and bear market concerns';
      
      const result = analyzeFinancialSentiment(title, summary);
      
      expect(result.label).toBe('Bearish');
      expect(result.compound).toBeLessThan(-0.1);
    });

    it('should weight title more heavily than summary', () => {
      const positiveTitle = 'Amazing breakthrough in profits';
      const neutralSummary = 'The company released quarterly results';
      
      const result = analyzeFinancialSentiment(positiveTitle, neutralSummary);
      
      expect(result.compound).toBeGreaterThan(0);
    });
  });

  describe('Sentiment Formatting', () => {
    it('should format positive scores correctly', () => {
      expect(formatSentimentScore(0.5)).toBe('+50.0%');
      expect(formatSentimentScore(0.123)).toBe('+12.3%');
    });

    it('should format negative scores correctly', () => {
      expect(formatSentimentScore(-0.5)).toBe('-50.0%');
      expect(formatSentimentScore(-0.123)).toBe('-12.3%');
    });

    it('should format zero score correctly', () => {
      expect(formatSentimentScore(0)).toBe('+0.0%');
    });
  });

  describe('Sentiment Icons', () => {
    it('should return correct icons for each sentiment', () => {
      const positive = { color: 'positive' as const, label: 'Bullish' as const, compound: 0.5, positive: 0.7, negative: 0.1, neutral: 0.2 };
      const negative = { color: 'negative' as const, label: 'Bearish' as const, compound: -0.5, positive: 0.1, negative: 0.7, neutral: 0.2 };
      const neutral = { color: 'neutral' as const, label: 'Neutral' as const, compound: 0, positive: 0.3, negative: 0.3, neutral: 0.4 };
      
      expect(getSentimentIcon(positive)).toBe('↗️');
      expect(getSentimentIcon(negative)).toBe('↘️');
      expect(getSentimentIcon(neutral)).toBe('➖');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in text', () => {
      const result = analyzeSentiment('Great! @#$%^&*() Amazing!!!');
      expect(result.label).toBe('Bullish');
    });

    it('should handle very long text', () => {
      const longText = 'positive '.repeat(1000);
      const result = analyzeSentiment(longText);
      expect(result.label).toBe('Bullish');
    });

    it('should handle mixed sentiment', () => {
      const result = analyzeSentiment('Good news but also bad concerns and terrible risks');
      // Should be neutral or slightly negative due to stronger negative words
      expect(['Neutral', 'Bearish']).toContain(result.label);
    });
  });
});