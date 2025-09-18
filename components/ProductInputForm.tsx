
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { CsvProduct } from '../types';
import { Card } from './common/Card';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MiniSpinner } from './icons/MiniSpinner';
import { suggestCompetitors } from '../services/geminiService';

interface ProductInputFormProps {
  onAnalyze: (input: { type: 'url', userProductUrl: string, competitorUrls: string[] } | { type: 'csv', products: CsvProduct[] }) => void;
  isLoading: boolean;
}

type InputType = 'url' | 'csv';

export const ProductInputForm: React.FC<ProductInputFormProps> = ({ onAnalyze, isLoading }) => {
  const [inputType, setInputType] = useState<InputType>('url');
  const [userProductUrl, setUserProductUrl] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['', '']);
  const [csvProducts, setCsvProducts] = useState<CsvProduct[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Refs for managing focus and debouncing
  const debounceTimeout = useRef<number | null>(null);
  const competitorInputsRef = useRef<HTMLDivElement>(null);
  const prevCompetitorUrlsLength = useRef(competitorUrls.length);

  const handleAddCompetitor = () => {
    setCompetitorUrls([...competitorUrls, '']);
  };

  const handleRemoveCompetitor = (index: number) => {
    setCompetitorUrls(competitorUrls.filter((_, i) => i !== index));
  };

  const handleCompetitorUrlChange = (index: number, value: string) => {
    const newUrls = [...competitorUrls];
    newUrls[index] = value;
    setCompetitorUrls(newUrls);
  };
  
  const triggerSuggestions = useCallback(async (url: string) => {
      if (!url.trim()) return;
      setIsSuggesting(true);
      setError(null);
      try {
          const suggestions = await suggestCompetitors(url);
          if (suggestions.length > 0) {
              setCompetitorUrls(prev => {
                  // Create a set of existing non-empty URLs
                  const existing = new Set(prev.filter(u => u.trim() !== ''));
                  // Filter suggestions to only include new ones
                  const newSuggestions = suggestions.filter(s => !existing.has(s));
                  // Combine existing with new, ensuring we have at least 2 fields
                  const combined = [...prev.filter(u => u.trim() !== ''), ...newSuggestions];
                  while (combined.length < 2) {
                      combined.push('');
                  }
                  return combined;
              });
          }
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not fetch suggestions.');
      } finally {
          setIsSuggesting(false);
      }
  }, []);

  const handleUserUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setUserProductUrl(url);

      if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = window.setTimeout(() => {
          triggerSuggestions(url);
      }, 1000); // 1 second delay
  };

  // Effect for debounced suggestions
  useEffect(() => {
      return () => {
          if (debounceTimeout.current) {
              clearTimeout(debounceTimeout.current);
          }
      };
  }, []);

  // Effect to auto-focus on a newly added competitor input field
  useEffect(() => {
    if (competitorUrls.length > prevCompetitorUrlsLength.current) {
      if (competitorInputsRef.current) {
        const inputs = competitorInputsRef.current.querySelectorAll('input[type="url"]');
        const lastInput = inputs[inputs.length - 1] as HTMLInputElement | null;
        if (lastInput) {
          lastInput.focus();
        }
      }
    }
    prevCompetitorUrlsLength.current = competitorUrls.length;
  }, [competitorUrls]);


  // const isUrlValid = (url: string) => {
  //   try {
  //     // Use a more robust regex to check for valid URL structure
  //     const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  //       '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
  //       '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  //       '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
  //       '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
  //       '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  //     return !!pattern.test(url);
  //   } catch (_) {
  //     return false;
  //   }
  // };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userProductUrl.trim() ) {
      setError('Please enter a valid URL for your product.');
      return;
    }
    const validCompetitorUrls = competitorUrls.filter(url => url.trim());
    onAnalyze({ type: 'url', userProductUrl, competitorUrls: validCompetitorUrls });
  };
  
  const parseCsv = (text: string): CsvProduct[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error("CSV parsing failed: The file is empty or contains only a header row.");
    }

    const header = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['productName', 'currentPrice'];
    for (const required of requiredHeaders) {
        if (!header.includes(required)) {
            throw new Error(`CSV parsing failed: The header is missing the required column "${required}".`);
        }
    }
    
    const rows = lines.slice(1);

    return rows.map((row, index) => {
      const rowNum = index + 2; // CSV rows are 1-based, plus 1 for the header
      const values = row.split(',');
      if (values.length !== header.length) {
        throw new Error(`CSV parsing failed on row ${rowNum}: Incorrect number of columns. Expected ${header.length}, but found ${values.length}. Please check for extra commas.`);
      }

      const productData = header.reduce((obj, col, i) => {
        // Handle case where a value might be missing for a column
        obj[col] = values[i] ? values[i].trim() : '';
        return obj;
      }, {} as any);
      
      const productName = productData.productName;
      const currentPriceStr = productData.currentPrice;
      
      if (!productName) {
        throw new Error(`CSV parsing failed on row ${rowNum}: The 'productName' column cannot be empty.`);
      }
      
      if (currentPriceStr === undefined || currentPriceStr === '') {
        throw new Error(`CSV parsing failed on row ${rowNum}: The 'currentPrice' column cannot be empty.`);
      }
      
      // Refined validation for 'currentPrice' to ensure it's a valid, non-negative number.
      // This is stricter than parseFloat, which can parse numbers from strings like "123xyz".
      const priceAsNumber = Number(currentPriceStr);
      if (!isFinite(priceAsNumber)) {
        throw new Error(`CSV parsing failed on row ${rowNum}: The value "${currentPriceStr}" in 'currentPrice' is not a valid number.`);
      }

      if (priceAsNumber < 0) {
        throw new Error(`CSV parsing failed on row ${rowNum}: The price "${currentPriceStr}" cannot be negative.`);
      }

      return {
        productName,
        currentPrice: priceAsNumber,
        userProductUrl: productData.userProductUrl || '',
        competitorUrls: productData.competitorUrls ? productData.competitorUrls.split(';').map((u: string) => u.trim()).filter(Boolean) : []
      };
    });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const products = parseCsv(text);
        setCsvProducts(products);
      } catch (err) {
        const errorMessage = err instanceof Error ? `Parsing error: ${err.message}` : 'Failed to parse CSV file.';
        setError(errorMessage);
        setCsvProducts([]);
        setFileName('');
      }
    };
    reader.onerror = () => {
      setError("Error reading the file.");
      setCsvProducts([]);
      setFileName('');
    };
    reader.readAsText(file);
  };
  
  const handleSubmitCsv = () => {
      setError(null);
      if (csvProducts.length === 0) {
          setError("No valid products to analyze. Please upload a CSV file with products.");
          return;
      }
      onAnalyze({ type: 'csv', products: csvProducts });
  };


  const renderUrlForm = () => (
    <form onSubmit={handleSubmitUrl} className="space-y-6">
      <div>
        <label htmlFor="user-product-url" className="block text-sm font-medium text-dark-text-primary mb-2">Your Product URL</label>
        <input
          type="url"
          id="user-product-url"
          value={userProductUrl}
          onChange={handleUserUrlChange}
          placeholder="https://yourstore.com/product"
          className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-text-primary mb-2">
            <div className="flex items-center gap-2">
                Competitor URLs
                {isSuggesting && <MiniSpinner className="w-4 h-4 text-brand-primary" />}
                {!isSuggesting && <SparklesIcon className="w-4 h-4 text-brand-primary" />}
            </div>
            <span className="text-xs text-dark-text-secondary">Enter your URL above to get AI suggestions</span>
        </label>
        <div ref={competitorInputsRef} className="space-y-3">
          {competitorUrls.map((url, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="url"
                value={url}
                onChange={(e) => handleCompetitorUrlChange(index, e.target.value)}
                placeholder="https://competitor.com/product"
                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
              />
              <button
                type="button"
                onClick={() => handleRemoveCompetitor(index)}
                className="p-2 text-dark-text-secondary hover:text-red-400 disabled:opacity-50"
                disabled={competitorUrls.length <= 1}
                aria-label="Remove competitor URL"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddCompetitor}
          className="mt-3 flex items-center space-x-2 text-sm text-brand-primary hover:text-teal-400 transition"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add another competitor</span>
        </button>
      </div>
       <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-slate-700 disabled:cursor-not-allowed">
        {isLoading ? <><MiniSpinner className="w-5 h-5" /> Analyzing...</> : <><SparklesIcon className="w-5 h-5" /> Analyze Prices</>}
      </button>
    </form>
  );

  const renderCsvForm = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-dark-text-secondary mb-3">
          Upload a CSV with required columns: <code className="bg-dark-bg text-xs p-1 rounded">productName,currentPrice</code>.
          <br />
          For more accuracy, you can optionally include a <code className="bg-dark-bg text-xs p-1 rounded">userProductUrl</code> column.
          <br/>
          <strong className="text-teal-400">Competitors are found automatically by the AI.</strong>
        </p>
        <label className="w-full flex justify-center items-center px-4 py-6 bg-dark-bg border-2 border-dark-border border-dashed rounded-md cursor-pointer hover:border-brand-primary transition">
            <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-dark-text-secondary" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="mt-2 block text-sm font-medium text-dark-text-primary">{fileName || 'Click to upload or drag and drop'}</span>
                <span className="block text-xs text-dark-text-secondary">CSV up to 1MB</span>
            </div>
            <input type='file' id="csv-upload" className="hidden" accept=".csv" onChange={handleFileChange} />
        </label>
      </div>
      {csvProducts.length > 0 && (
          <div className="text-center text-green-400 text-sm">
              Successfully parsed {csvProducts.length} products. Ready for batch analysis.
          </div>
      )}
      <button onClick={handleSubmitCsv} disabled={isLoading || csvProducts.length === 0} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-slate-700 disabled:cursor-not-allowed">
        {isLoading ? <><MiniSpinner className="w-5 h-5" /> Analyzing...</> : <><SparklesIcon className="w-5 h-5" /> Analyze {csvProducts.length > 0 ? `${csvProducts.length} ` : ''}Products</>}
      </button>
    </div>
  );

  const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition ${
        active
          ? 'bg-brand-primary text-white'
          : 'text-dark-text-secondary hover:bg-slate-700/50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <Card className="max-w-3xl mx-auto">
      <div className="flex justify-center mb-6">
        <div className="flex space-x-1 p-1 bg-slate-900 rounded-lg">
          <TabButton active={inputType === 'url'} onClick={() => setInputType('url')}>Analyze by URL</TabButton>
          <TabButton active={inputType === 'csv'} onClick={() => setInputType('csv')}>Batch Analyze by CSV</TabButton>
        </div>
      </div>
      
      {inputType === 'url' ? renderUrlForm() : renderCsvForm()}

      {error && (
          <div className="mt-4 text-sm text-center text-red-400 bg-red-900/30 p-3 rounded-md whitespace-pre-wrap">
              {error}
          </div>
      )}
    </Card>
  );
};
