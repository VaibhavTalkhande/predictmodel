
import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProductInputForm } from './components/ProductInputForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import type { AnalysisResult, CsvProduct } from './types';
import { analyzeSingleProduct, analyzeBatchProducts } from './services/geminiService';

type AppState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: AnalysisResult | null;
  error: string | null;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    data: null,
    error: null,
  });

  const handleAnalysis = async (input: { type: 'url', userProductUrl: string, competitorUrls: string[] } | { type: 'csv', products: CsvProduct[] }) => {
    setState({ status: 'loading', data: null, error: null });
    try {
      let result: AnalysisResult;
      if (input.type === 'url') {
        const singleResult = await analyzeSingleProduct(input.userProductUrl, input.competitorUrls);
        result = [singleResult]; // Wrap single result in an array for consistent handling
      } else {
        result = await analyzeBatchProducts(input.products);
      }
      setState({ status: 'success', data: result, error: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setState({ status: 'error', data: null, error: errorMessage });
    }
  };

  const WelcomeMessage = () => (
    <div className="text-center p-8 rounded-lg bg-dark-card border border-dark-border mt-8">
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to PredictGenie</h2>
      <p className="text-dark-text-secondary">
        Analyze prices by URL or upload a CSV for batch analysis to get AI-powered pricing suggestions.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <ProductInputForm onAnalyze={handleAnalysis} isLoading={state.status === 'loading'} />
        
        {state.status === 'loading' && (
          <div className="flex justify-center items-center mt-8">
            <LoadingSpinner />
          </div>
        )}

        {state.status === 'error' && (
          <div className="mt-8 text-center p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg">
            <p className="font-bold text-lg mb-2">Analysis Failed</p>
            <p className="whitespace-pre-wrap">{state.error}</p>
          </div>
        )}

        {state.status === 'success' && state.data && (
          <ResultsDisplay result={state.data} />
        )}

        {state.status === 'idle' && <WelcomeMessage />}
      </main>
      <Footer />
    </div>
  );
};

export default App;