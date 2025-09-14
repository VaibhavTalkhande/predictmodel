import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisResult, ProductAnalysis, Competitor, UserProduct } from '../types';
import { Card } from './common/Card';
import { PriceHistoryChart } from './PriceHistoryChart';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { EqualsIcon } from './icons/EqualsIcon';
import { InfoIcon } from './icons/InfoIcon';
import { ExportIcon } from './icons/ExportIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { exportToCsv, exportCompetitorsToCsv, exportPriceHistoryToCsv } from '../utils/csvExporter';
import { exportToJson } from '../utils/jsonExporter';


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <ArrowUpIcon className="w-4 h-4 text-red-400" />;
    case 'down': return <ArrowDownIcon className="w-4 h-4 text-green-400" />;
    case 'stable': return <EqualsIcon className="w-4 h-4 text-gray-400" />;
    default: return null;
  }
};

const getStockColor = (status: 'In Stock' | 'Low Stock' | 'Out of Stock') => {
   switch (status) {
    case 'In Stock': return 'bg-green-500';
    case 'Low Stock': return 'bg-yellow-500';
    case 'Out of Stock': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

const PriceWithDiscount: React.FC<{ price: number; originalPrice?: number; discountPercentage?: number }> = ({ price, originalPrice, discountPercentage }) => {
  if (!originalPrice || originalPrice <= price) {
    return <span className="font-bold text-white">{formatCurrency(price)}</span>;
  }
  return (
    <div className="flex items-center justify-end gap-2">
      {discountPercentage && discountPercentage > 0 && (
        <span className="bg-red-500/80 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
          {Math.round(discountPercentage)}% OFF
        </span>
      )}
      <div className="flex flex-col items-end">
        <span className="font-bold text-white">{formatCurrency(price)}</span>
        <s className="text-xs text-red-400">{formatCurrency(originalPrice)}</s>
      </div>
    </div>
  );
};


const ProductAnalysisCard: React.FC<{ analysis: ProductAnalysis }> = ({ analysis }) => {
  const { userProduct, competitors, suggestedPrice, reasoning, marketSummary, historicalPriceAnalysis, sources } = analysis;

  return (
    <Card className="mb-8 last:mb-0">
      <header>
        <h2 className="text-2xl font-bold text-white mb-2">{userProduct.productName}</h2>
        <p className="text-dark-text-secondary mb-6">{marketSummary}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-slate-900/50">
            <h3 className="text-base font-semibold text-dark-text-secondary mb-1">Your Current Price</h3>
            <div className="text-3xl font-bold text-white">
                <PriceWithDiscount price={userProduct.currentPrice} originalPrice={userProduct.originalPrice} discountPercentage={userProduct.discountPercentage} />
            </div>
          </Card>
          <Card className="bg-brand-primary/10 border-brand-primary">
            <h3 className="text-base font-semibold text-dark-text-secondary mb-1">Suggested Price</h3>
            <p className="text-4xl font-bold text-brand-primary">{formatCurrency(suggestedPrice)}</p>
          </Card>
          <Card className="bg-slate-900/50 flex-grow">
             <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><InfoIcon className="w-5 h-5 text-brand-primary" /> Reasoning</h3>
            <p className="text-sm text-dark-text-secondary whitespace-pre-wrap">{reasoning}</p>
          </Card>
        </aside>

        <section className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-white mb-4">Competitor Landscape</h3>
            <div className="overflow-x-auto rounded-lg border border-dark-border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-xs text-dark-text-secondary uppercase">
                        <tr>
                            <th scope="col" className="px-4 py-3">Product</th>
                            <th scope="col" className="px-4 py-3 text-right">Price</th>
                            <th scope="col" className="px-4 py-3">Stock</th>
                            <th scope="col" className="px-4 py-3 text-center">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {competitors.map((competitor, index) => (
                            <tr key={index} className="border-t border-dark-border hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-medium text-white max-w-xs truncate" title={competitor.productName}>
                                  <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">{competitor.productName}</a>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <PriceWithDiscount price={competitor.price} originalPrice={competitor.originalPrice} discountPercentage={competitor.discountPercentage} />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${getStockColor(competitor.stockStatus)}`}></span>
                                    <span className="text-dark-text-secondary">{competitor.stockStatus}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3"><div className="flex justify-center">{getTrendIcon(competitor.priceTrend)}</div></td>
                            </tr>
                        ))}
                         {competitors.length === 0 && (
                            <tr className="border-t border-dark-border">
                                <td colSpan={4} className="text-center py-8 text-dark-text-secondary">No competitor data found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
      </div>
      
      <section className="mt-8">
        <h3 className="text-xl font-semibold text-white mb-2">30-Day Price History</h3>
        {historicalPriceAnalysis && <p className="text-sm text-dark-text-secondary mb-4">{historicalPriceAnalysis}</p>}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-dark-border">
          <PriceHistoryChart userProduct={userProduct} competitors={competitors} />
        </div>
      </section>

      {sources && sources.length > 0 && (
        <footer className="mt-8 pt-4 border-t border-dark-border">
          <h4 className="text-sm font-semibold text-dark-text-secondary mb-2">Sources</h4>
          <ul className="flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <li key={index}>
                <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-700 hover:bg-slate-600 text-dark-text-secondary px-2 py-1 rounded-full transition-colors truncate block max-w-xs" title={source.web.title || source.web.uri}>
                  {source.web.title || source.web.uri}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </Card>
  );
};

const ExpandedRowDetails: React.FC<{ userProduct: UserProduct; competitors: Competitor[]; historicalPriceAnalysis: string; }> = ({ userProduct, competitors, historicalPriceAnalysis }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/50 p-4">
        <div>
            <h3 className="text-lg font-semibold text-white mb-4">Competitor Landscape</h3>
            <div className="overflow-x-auto rounded-lg border border-dark-border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-dark-card text-xs text-dark-text-secondary uppercase">
                        <tr>
                            <th scope="col" className="px-4 py-3">Product</th>
                            <th scope="col" className="px-4 py-3 text-right">Price</th>
                            <th scope="col" className="px-4 py-3">Stock</th>
                            <th scope="col" className="px-4 py-3 text-center">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {competitors.map((c, i) => (
                            <tr key={i} className="border-t border-dark-border hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-medium text-white max-w-xs truncate" title={c.productName}>
                                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary">{c.productName}</a>
                                </td>
                                <td className="px-4 py-3 text-right"><PriceWithDiscount price={c.price} originalPrice={c.originalPrice} discountPercentage={c.discountPercentage} /></td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${getStockColor(c.stockStatus)}`}></span>
                                        <span>{c.stockStatus}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3"><div className="flex justify-center">{getTrendIcon(c.priceTrend)}</div></td>
                            </tr>
                        ))}
                        {competitors.length === 0 && (
                           <tr className="border-t border-dark-border"><td colSpan={4} className="text-center py-8 text-dark-text-secondary">No competitor data.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-white mb-4">30-Day Price History</h3>
            {historicalPriceAnalysis && <p className="text-sm text-dark-text-secondary mb-4">{historicalPriceAnalysis}</p>}
            <div className="p-4 rounded-lg bg-dark-card border border-dark-border">
                <PriceHistoryChart userProduct={userProduct} competitors={competitors} />
            </div>
        </div>
    </div>
);


const HeaderWithExport: React.FC<{ title: string; resultData: AnalysisResult }> = ({ title, resultData }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleExport = (type: 'all-csv' | 'all-json' | 'competitors-csv' | 'history-csv') => {
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        let fileName;

        switch (type) {
            case 'all-csv':
                fileName = `predictgenie_analysis_${timestamp}.csv`;
                exportToCsv(resultData, fileName);
                break;
            case 'all-json':
                fileName = `predictgenie_analysis_${timestamp}.json`;
                exportToJson(resultData, fileName);
                break;
            case 'competitors-csv':
                fileName = `predictgenie_competitors_${timestamp}.csv`;
                exportCompetitorsToCsv(resultData, fileName);
                break;
            case 'history-csv':
                fileName = `predictgenie_price_history_${timestamp}.csv`;
                exportPriceHistoryToCsv(resultData, fileName);
                break;
        }
        setIsMenuOpen(false); // Close menu after selection
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-3xl font-bold text-white text-center sm:text-left">{title}</h2>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300"
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                >
                    <ExportIcon className="w-5 h-5" />
                    Export
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 origin-top-right bg-dark-card border border-dark-border rounded-md shadow-lg z-10">
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleExport('all-csv'); }}
                                className="block px-4 py-2 text-sm text-dark-text-primary hover:bg-slate-700/50"
                                role="menuitem"
                            >
                                Export Full Analysis (CSV)
                            </a>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleExport('all-json'); }}
                                className="block px-4 py-2 text-sm text-dark-text-primary hover:bg-slate-700/50"
                                role="menuitem"
                            >
                                Export Full Analysis (JSON)
                            </a>
                             <div className="border-t border-dark-border my-1"></div>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleExport('competitors-csv'); }}
                                className="block px-4 py-2 text-sm text-dark-text-primary hover:bg-slate-700/50"
                                role="menuitem"
                            >
                                Export Competitor Data (CSV)
                            </a>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleExport('history-csv'); }}
                                className="block px-4 py-2 text-sm text-dark-text-primary hover:bg-slate-700/50"
                                role="menuitem"
                            >
                                Export Price History (CSV)
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ResultsDisplay: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!result || result.length === 0) {
    return null;
  }
  
  // Single result view
  if (result.length === 1) {
    return (
      <div className="mt-12">
        <HeaderWithExport title="Analysis Result" resultData={result} />
        <ProductAnalysisCard analysis={result[0]} />
      </div>
    );
  }

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Batch result table view
  return (
    <div className="mt-12">
      <HeaderWithExport title="Batch Analysis Results" resultData={result} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-xs text-dark-text-secondary uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3 text-right">Current Price</th>
                <th scope="col" className="px-4 py-3 text-right">Suggested Price</th>
                <th scope="col" className="px-4 py-3 text-right">Change</th>
                <th scope="col" className="px-4 py-3 text-center">Reasoning</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">View Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {result.map((analysis, index) => {
                const { userProduct, suggestedPrice, reasoning, competitors, historicalPriceAnalysis } = analysis;
                const priceChange = suggestedPrice - userProduct.currentPrice;
                const isExpanded = expandedIndex === index;

                return (
                  <React.Fragment key={index}>
                    <tr>
                      <td className="px-4 py-4 font-medium text-white max-w-sm truncate" title={userProduct.productName}>
                        {userProduct.productName}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-dark-text-secondary">{formatCurrency(userProduct.currentPrice)}</td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-brand-primary">{formatCurrency(suggestedPrice)}</td>
                      <td className={`px-4 py-4 text-right font-mono font-semibold ${priceChange > 0 ? 'text-green-400' : priceChange < 0 ? 'text-red-400' : 'text-dark-text-secondary'}`}>
                        {priceChange > 0 ? '+' : ''}{formatCurrency(priceChange)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative group flex justify-center">
                          <InfoIcon className="w-5 h-5 text-dark-text-secondary group-hover:text-brand-primary cursor-pointer" />
                          <div className="absolute bottom-full mb-2 w-80 p-3 bg-slate-900 border border-dark-border rounded-lg text-xs text-left text-dark-text-secondary shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 whitespace-pre-wrap pointer-events-none">
                            <h4 className="font-bold text-white mb-1">AI Reasoning</h4>
                            {reasoning}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                         <button onClick={() => handleToggleExpand(index)} className="p-1 text-dark-text-secondary hover:text-white" aria-expanded={isExpanded} aria-label="View Details">
                           {isExpanded ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
                         </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6}>
                          <ExpandedRowDetails userProduct={userProduct} competitors={competitors} historicalPriceAnalysis={historicalPriceAnalysis} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};