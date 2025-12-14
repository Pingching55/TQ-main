import vader from 'vader-sentiment';

export interface SentimentResult {
  compound: number;
  positive: number;
  negative: number;
  neutral: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  color: 'positive' | 'negative' | 'neutral';
}

export function analyzeSentiment(text: string): SentimentResult {
  // Clean the text for better analysis
  const cleanText = text
    .replace(/[^\w\s.,!?-]/g, ' ') // Remove special chars except basic punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Run VADER sentiment analysis
  const scores = vader.SentimentIntensityAnalyzer.polarity_scores(cleanText);

  // Determine sentiment label based on compound score
  let label: 'Bullish' | 'Bearish' | 'Neutral';
  let color: 'positive' | 'negative' | 'neutral';

  if (scores.compound >= 0.05) {
    label = 'Bullish';
    color = 'positive';
  } else if (scores.compound <= -0.05) {
    label = 'Bearish';
    color = 'negative';
  } else {
    label = 'Neutral';
    color = 'neutral';
  }

  return {
    compound: scores.compound,
    positive: scores.pos,
    negative: scores.neg,
    neutral: scores.neu,
    label,
    color
  };
}

export function formatSentimentScore(score: number): string {
  const percentage = (score * 100).toFixed(1);
  return score >= 0 ? `+${percentage}%` : `${percentage}%`;
}

export function getSentimentIcon(sentiment: SentimentResult) {
  if (sentiment.color === 'positive') {
    return '↗️'; // Up arrow for bullish
  } else if (sentiment.color === 'negative') {
    return '↘️'; // Down arrow for bearish
  }
  return '➖'; // Horizontal line for neutral
}

// Enhanced sentiment analysis for financial text
export function analyzeFinancialSentiment(title: string, summary: string): SentimentResult {
  // Combine title and summary with title weighted more heavily
  const combinedText = `${title} ${title} ${summary}`;
  
  // Financial-specific keyword boosting
  const financialBullishWords = [
    'profit', 'gain', 'rise', 'surge', 'rally', 'bull', 'bullish', 'growth', 
    'increase', 'up', 'positive', 'strong', 'beat', 'exceed', 'outperform',
    'breakthrough', 'success', 'record', 'high', 'soar', 'climb'
  ];
  
  const financialBearishWords = [
    'loss', 'fall', 'drop', 'crash', 'bear', 'bearish', 'decline', 'decrease',
    'down', 'negative', 'weak', 'miss', 'underperform', 'concern', 'worry',
    'risk', 'threat', 'low', 'plunge', 'tumble', 'slide'
  ];

  let sentiment = analyzeSentiment(combinedText);
  
  // Apply financial keyword boosting
  const lowerText = combinedText.toLowerCase();
  let boost = 0;
  
  financialBullishWords.forEach(word => {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    boost += matches * 0.1;
  });
  
  financialBearishWords.forEach(word => {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    boost -= matches * 0.1;
  });
  
  // Apply boost to compound score
  sentiment.compound = Math.max(-1, Math.min(1, sentiment.compound + boost));
  
  // Recalculate label based on boosted score
  if (sentiment.compound >= 0.05) {
    sentiment.label = 'Bullish';
    sentiment.color = 'positive';
  } else if (sentiment.compound <= -0.05) {
    sentiment.label = 'Bearish';
    sentiment.color = 'negative';
  } else {
    sentiment.label = 'Neutral';
    sentiment.color = 'neutral';
  }
  
  return sentiment;
}