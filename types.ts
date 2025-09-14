export interface HistoricalPricePoint {
  date: string; // e.g., 'YYYY-MM-DD'
  price: number;
}

export interface Competitor {
  url: string;
  productName: string;
  price: number; // This is the current selling price
  originalPrice?: number; // The price before discount
  discountPercentage?: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  priceTrend: 'up' | 'down' | 'stable';
  historicalPrices?: HistoricalPricePoint[];
}

export interface UserProduct {
  url?: string; // URL is optional for CSV input
  productName: string;
  currentPrice: number; // This is the current selling price
  originalPrice?: number; // The price before discount
  discountPercentage?: number;
  historicalPrices?: HistoricalPricePoint[];
}

// This represents a single product's full analysis
export interface ProductAnalysis {
  userProduct: UserProduct;
  competitors: Competitor[];
  suggestedPrice: number;
  reasoning: string;
  marketSummary: string;
  historicalPriceAnalysis: string;
  sources?: { web: { uri: string; title: string } }[]; // Added for web search results
}

// The overall result from an analysis run is an array of individual analyses
export type AnalysisResult = ProductAnalysis[];


// This is for passing data to the analysis service
export interface CsvProduct {
  productName: string;
  currentPrice: number;
  userProductUrl: string; // can be empty
  competitorUrls: string[]; // can be empty
}