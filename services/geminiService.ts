import { GoogleGenAI } from '@google/genai';
import type { AnalysisResult, CsvProduct, ProductAnalysis } from '../types';

// FIX: Initialize the GoogleGenAI client according to the documentation.
// The API key is sourced from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// FIX: Use the recommended model 'gemini-2.5-flash'.
const model = 'gemini-2.5-flash';

/**
 * Cleans the raw text response from the model to extract the JSON object.
 * @param text The raw text response.
 * @returns A string containing only the JSON.
 */
const cleanJsonFromResponse = (text: string): string => {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback for cases where the model doesn't use markdown formatting
  return text.trim();
};

/**
 * Performs a product analysis using the Gemini API.
 * @param userProductIdentifier Information about the user's product (either URL or name/price).
 * @param competitorUrls A list of competitor product URLs.
 * @returns A promise that resolves to a ProductAnalysis object.
 */
async function performSingleAnalysis(
  userProductIdentifier: { url: string } | { name: string; price: number },
  competitorUrls: string[]
): Promise<ProductAnalysis> {
    
    let userProductPrompt = '';
    if ('url' in userProductIdentifier && userProductIdentifier.url) {
        userProductPrompt = `User's Product URL: ${userProductIdentifier.url}`;
    } else if ('name' in userProductIdentifier) {
        userProductPrompt = `User's Product Name: "${userProductIdentifier.name}", Current Price: ${userProductIdentifier.price} INR.`;
    }

    const prompt = `
    You are PredictGenie, an expert e-commerce pricing analyst. Your task is to analyze a user's product against its competitors to suggest an optimal price.

    **Analysis Task:**

    **CRITICAL NON-NEGOTIABLE INSTRUCTION: 30-DAY HISTORICAL PRICE DATA**
    Your primary and most critical task is to generate 30 days of historical price data for BOTH the user's product and EVERY competitor product. This is not optional. The application's data visualization features will fail completely without this data.

    - **Mandatory Synthesis:** If you cannot find real historical data through your search, you ABSOLUTELY MUST synthesize a realistic and plausible 30-day price history. Do not leave the \`historicalPrices\` array empty or null under any circumstances.
    - **Data Structure:** The \`historicalPrices\` array for the \`UserProduct\` object and for EACH \`Competitor\` object MUST be populated with approximately 30 entries.
    - **Format:** Each entry within the array must be an object with two keys:
        1. \`date\`: A string in 'YYYY-MM-DD' format, covering the last 30 consecutive days, ending with today's date.
        2. \`price\`: A number representing the price on that day.
    
    Failure to adhere strictly to this instruction will result in an unusable response.

    1.  **Analyze the User's Product:**
        -   ${userProductPrompt}
        -   If a URL is provided, use Google Search to find the product name, its **current selling price**, and its **original price if a discount is present**. The 'currentPrice' field in the JSON must always be the final price a customer pays. If there's a discount, capture the original price in the 'originalPrice' field.

    2.  **Analyze Competitors:**
        -   **Competitor Discovery & Analysis:**
            -   ${competitorUrls.length > 0
                ? `Analyze the provided competitor URLs: ${competitorUrls.join(', ')}`
                : "The user has not provided competitor URLs. You MUST use Google Search to find 2-3 of the most relevant e-commerce product pages for direct competitors to the user's product. Prioritize well-known retailers and direct product matches."
            }
        -   For each competitor page (either provided or found via search), extract the product's URL, name, its **current selling price**, and its **original price if a discount is present**. The 'price' field for a competitor in the JSON must always be the final price a customer pays. Capture the original price in the 'originalPrice' field if there is a discount. Also extract the stock status ('In Stock', 'Low Stock', 'Out of Stock'), and recent price trend ('up', 'down', 'stable').

    3.  **Synthesize Findings & Suggest Price:**
        -   **Market Summary:** Write a brief, one-paragraph overview of the market landscape based on your findings.
        -   **Historical Price Analysis:** Provide a one-paragraph summary analyzing the historical price trends you have generated or found for the user's product vs. competitors. Note any significant patterns like price wars, seasonal fluctuations, or recent aggressive discounting.
        -   **Suggested Price:** Based on all data, recommend a new, optimal selling price in INR for the user's product. The price must be a whole number.
        -   **Reasoning:** Provide a concise, bulleted list explaining your price suggestion. Consider market position, competitor prices (both standard and discounted), stock levels, and price trends.

    **Output Format:**
    Your entire response MUST be a single, valid JSON object enclosed in \`\`\`json ... \`\`\`. Do not include any text before or after the JSON block. The JSON structure must conform to this TypeScript interface:
    
    \`\`\`typescript
    interface HistoricalPricePoint {
      date: string; // 'YYYY-MM-DD', for the last 30 days
      price: number;
    }

    interface Competitor {
      url: string;
      productName: string;
      price: number;
      originalPrice?: number;
      discountPercentage?: number;
      stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
      priceTrend: 'up' | 'down' | 'stable';
      historicalPrices?: HistoricalPricePoint[];
    }

    interface UserProduct {
      url?: string;
      productName: string;
      currentPrice: number;
      originalPrice?: number;
      discountPercentage?: number;
      historicalPrices?: HistoricalPricePoint[];
    }

    interface ProductAnalysis {
      userProduct: UserProduct;
      competitors: Competitor[];
      suggestedPrice: number;
      reasoning: string;
      marketSummary: string;
      historicalPriceAnalysis: string;
    }
    \`\`\`

    Begin your response now with the JSON object.
    `;
    
    try {
        // FIX: Call ai.models.generateContent with the correct model, contents, and config.
        // Using Google Search for grounding, which is required for fetching data from URLs.
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        // FIX: Extract text from the response object directly using the .text property.
        const jsonText = cleanJsonFromResponse(response.text);
        
        if (!jsonText) {
          throw new Error("Received an empty response from the AI. The analysis could not be completed. Please try again.");
        }

        const result = JSON.parse(jsonText) as ProductAnalysis;

        // FIX: Add sources from grounding metadata for attribution.
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          // FIX: Map grounding chunks to the expected type, filtering out any with missing URIs,
          // to match the 'sources' property in the ProductAnalysis interface.
          result.sources = response.candidates[0].groundingMetadata.groundingChunks
            .filter(chunk => chunk.web?.uri)
            .map(chunk => ({
              web: {
                uri: chunk.web.uri!,
                title: chunk.web.title || chunk.web.uri!,
              },
            }));
        }

        return result;
    } catch (error) {
        console.error("Error during Gemini API call or JSON parsing:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
             throw new Error(`The AI returned a response that could not be processed. Please try your request again.`);
        }
        if (error instanceof Error) {
            throw new Error(`Failed to get analysis from AI: ${error.message}.`);
        }
        throw new Error("An unknown error occurred during AI analysis.");
    }
}


/**
 * Analyzes a single product by its URL against competitor URLs.
 * @param userProductUrl The URL of the user's product.
 * @param competitorUrls An array of competitor product URLs.
 * @returns A promise that resolves to a single ProductAnalysis object.
 */
export const analyzeSingleProduct = async (userProductUrl: string, competitorUrls: string[]): Promise<ProductAnalysis> => {
    if (!userProductUrl) {
        throw new Error("User product URL is required for single product analysis.");
    }
    return performSingleAnalysis({ url: userProductUrl }, competitorUrls);
};

/**
 * Analyzes a batch of products from CSV data.
 * @param products An array of products from the parsed CSV.
 * @returns A promise that resolves to an array of ProductAnalysis objects.
 */
export const analyzeBatchProducts = async (products: CsvProduct[]): Promise<AnalysisResult> => {
    const analysisPromises = products.map(product => {
        const userIdentifier = product.userProductUrl
            ? { url: product.userProductUrl }
            : { name: product.productName, price: product.currentPrice };
        // For batch analysis, we now rely on the AI to find competitors.
        return performSingleAnalysis(userIdentifier, product.competitorUrls || []);
    });

    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled(analysisPromises);
    
    const successfulAnalyses: ProductAnalysis[] = [];
    const failedAnalyses: string[] = [];
    
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            successfulAnalyses.push(result.value);
        } else {
            const productName = products[index].productName;
            console.error(`Analysis failed for product "${productName}":`, result.reason);
            failedAnalyses.push(productName)
        }
    });

    if (successfulAnalyses.length === 0 && results.length > 0) {
        const failedList = failedAnalyses.join(', ');
        throw new Error(`All product analyses failed. The following products could not be analyzed: ${failedList}. Please check the console for more details.`);
    }

    return successfulAnalyses;
};

/**
 * Suggests competitor URLs for a given product URL.
 * @param userProductUrl The URL of the user's product.
 * @returns A promise that resolves to an array of competitor URLs.
 */
export const suggestCompetitors = async (userProductUrl: string): Promise<string[]> => {
    const prompt = `
    Based on the following product page, please use Google Search to find the URLs of 2-3 direct competitors from different e-commerce websites.
    
    Product URL: ${userProductUrl}

    Your response must be a valid JSON array of strings, where each string is a competitor's URL. For example: ["https://competitor1.com/product-a", "https://competitor2.com/product-b"]
    Do not include any other text, just the JSON array.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const jsonText = cleanJsonFromResponse(response.text);
        if (!jsonText) return [];

        const urls = JSON.parse(jsonText);
        if (Array.isArray(urls) && urls.every(u => typeof u === 'string')) {
            return urls;
        }
        return [];
    } catch (error) {
        console.error("Error suggesting competitors:", error);
        return [];
    }
};