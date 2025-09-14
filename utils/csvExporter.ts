import type { AnalysisResult } from '../types';

const escapeCsvField = (field: any): string => {
    // Convert null/undefined to empty string
    if (field == null) {
        return '';
    }
    
    const stringField = String(field);

    // If the field contains a comma, a double quote, or a newline,
    // it needs to be enclosed in double quotes.
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        // Any double quote inside the field must be escaped by another double quote.
        const escapedField = stringField.replace(/"/g, '""');
        return `"${escapedField}"`;
    }

    return stringField;
};

const triggerCsvDownload = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Check for download attribute support
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

export const exportToCsv = (data: AnalysisResult, fileName: string = 'predictgenie_analysis.csv') => {
    if (!data || data.length === 0) {
        console.warn("No data available to export.");
        return;
    }

    const maxCompetitors = Math.max(0, ...data.map(analysis => analysis.competitors?.length || 0));

    const baseHeaders = [
        'Product Name',
        'Current Price',
        'Suggested Price',
        'Market Summary',
        'Historical Price Analysis',
        'Reasoning'
    ];
    
    const competitorHeaders: string[] = [];
    for (let i = 1; i <= maxCompetitors; i++) {
        competitorHeaders.push(`Competitor ${i} Name`);
        competitorHeaders.push(`Competitor ${i} Price`);
        competitorHeaders.push(`Competitor ${i} Stock Status`);
        competitorHeaders.push(`Competitor ${i} Price Trend`);
    }

    const headers = [...baseHeaders, ...competitorHeaders];

    const rows = data.map(analysis => {
        const { userProduct, suggestedPrice, marketSummary, historicalPriceAnalysis, reasoning, competitors } = analysis;
        const baseRow = [
            escapeCsvField(userProduct.productName),
            escapeCsvField(userProduct.currentPrice),
            escapeCsvField(suggestedPrice),
            escapeCsvField(marketSummary),
            escapeCsvField(historicalPriceAnalysis),
            escapeCsvField(reasoning)
        ];
        
        const competitorRowData: string[] = [];
        for (let i = 0; i < maxCompetitors; i++) {
            const competitor = competitors?.[i];
            if (competitor) {
                competitorRowData.push(escapeCsvField(competitor.productName));
                competitorRowData.push(escapeCsvField(competitor.price));
                competitorRowData.push(escapeCsvField(competitor.stockStatus));
                competitorRowData.push(escapeCsvField(competitor.priceTrend));
            } else {
                // Pad with empty strings if no competitor at this index
                competitorRowData.push('');
                competitorRowData.push('');
                competitorRowData.push('');
                competitorRowData.push('');
            }
        }
        
        return [...baseRow, ...competitorRowData].join(',');
    });

    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    triggerCsvDownload(csvContent, fileName);
};


export const exportCompetitorsToCsv = (data: AnalysisResult, fileName: string = 'predictgenie_competitors.csv') => {
    if (!data || data.length === 0) {
        console.warn("No competitor data to export.");
        return;
    }

    const headers = [
        'Analyzed Product',
        'Competitor Name',
        'Competitor URL',
        'Current Price',
        'Original Price',
        'Stock Status',
        'Price Trend'
    ];

    const rows: string[] = [];

    data.forEach(analysis => {
        const { userProduct, competitors } = analysis;
        if (competitors && competitors.length > 0) {
            competitors.forEach(competitor => {
                const row = [
                    escapeCsvField(userProduct.productName),
                    escapeCsvField(competitor.productName),
                    escapeCsvField(competitor.url),
                    escapeCsvField(competitor.price),
                    escapeCsvField(competitor.originalPrice),
                    escapeCsvField(competitor.stockStatus),
                    escapeCsvField(competitor.priceTrend)
                ].join(',');
                rows.push(row);
            });
        }
    });

    if (rows.length === 0) {
        alert("No competitor data found in the analysis to export.");
        return;
    }

    const csvContent = [headers.join(','), ...rows].join('\n');
    triggerCsvDownload(csvContent, fileName);
};

export const exportPriceHistoryToCsv = (data: AnalysisResult, fileName: string = 'predictgenie_price_history.csv') => {
    if (!data || data.length === 0) {
        console.warn("No price history data to export.");
        return;
    }

    const headers = ['Analyzed Product', 'Source Product', 'Date', 'Price'];
    const rows: string[] = [];

    data.forEach(analysis => {
        const { userProduct, competitors } = analysis;

        if (userProduct.historicalPrices) {
            userProduct.historicalPrices.forEach(point => {
                const row = [
                    escapeCsvField(userProduct.productName),
                    escapeCsvField(userProduct.productName), // Source is itself
                    escapeCsvField(point.date),
                    escapeCsvField(point.price)
                ].join(',');
                rows.push(row);
            });
        }

        if (competitors) {
            competitors.forEach(competitor => {
                if (competitor.historicalPrices) {
                    competitor.historicalPrices.forEach(point => {
                        const row = [
                            escapeCsvField(userProduct.productName),
                            escapeCsvField(competitor.productName),
                            escapeCsvField(point.date),
                            escapeCsvField(point.price)
                        ].join(',');
                        rows.push(row);
                    });
                }
            });
        }
    });

     if (rows.length === 0) {
        alert("No historical price data found in the analysis to export.");
        return;
    }

    const csvContent = [headers.join(','), ...rows].join('\n');
    triggerCsvDownload(csvContent, fileName);
};