declare module 'vader-sentiment' {
  interface SentimentScores {
    compound: number;
    pos: number;
    neg: number;
    neu: number;
  }

  interface SentimentIntensityAnalyzer {
    polarity_scores(text: string): SentimentScores;
  }

  const vader: {
    SentimentIntensityAnalyzer: SentimentIntensityAnalyzer;
  };

  export = vader;
}