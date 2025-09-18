import React, { useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProductInputForm } from "./components/ProductInputForm";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { LoadingSpinner } from "./components/LoadingSpinner";
import type { AnalysisResult, CsvProduct } from "./types";
import {
  analyzeSingleProduct,
  analyzeBatchProducts,
} from "./services/geminiService";
import { predictPrice, predictBatch } from "./services/priceService";
import {
  analysisToPredictPayload,
  analysesToPredictPayloads,
} from "./services/mlMapper";

type AppState = {
  status: "idle" | "loading" | "success" | "error";
  data: AnalysisResult | null;
  error: string | null;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: "idle",
    data: null,
    error: null,
  });

  const handleAnalysis = async (
    input:
      | { type: "url"; userProductUrl: string; competitorUrls: string[] }
      | { type: "csv"; products: CsvProduct[] }
  ) => {
    setState({ status: "loading", data: null, error: null });
    try {
      let result: AnalysisResult;

      if (input.type === "url") {
        // 1) AI analysis
        const singleResult = await analyzeSingleProduct(
          input.userProductUrl,
          input.competitorUrls
        );

        // 2) ML prediction (overwrite suggestedPrice if valid)
        try {
          const payload = analysisToPredictPayload(singleResult);
          const predicted = await predictPrice(payload);
          if (Number.isFinite(predicted)) {
            singleResult.suggestedPrice = Math.round(Number(predicted));
          }
        } catch (e: any) {
          const msg = typeof e?.message === "string" ? e.message : "";
          if (msg.toLowerCase().includes("not trained")) {
            console.warn("⚠️ ML model not trained; using AI-only suggestion.");
          } else {
            console.warn("⚠️ Prediction failed; using AI-only suggestion:", e);
          }
        }

        result = [singleResult];
      } else {
        // 1) AI batch analysis
        const analyses = await analyzeBatchProducts(input.products);

        // 2) ML batch prediction
        try {
          const payloads = analysesToPredictPayloads(analyses);
          const preds = await predictBatch(payloads);
          preds.forEach((p, i) => {
            if (Number.isFinite(p)) {
              analyses[i].suggestedPrice = Math.round(Number(p));
            }
          });
        } catch (e: any) {
          const msg = typeof e?.message === "string" ? e.message : "";
          if (msg.toLowerCase().includes("not trained")) {
            console.warn("⚠️ ML model not trained; using AI-only batch suggestions.");
          } else {
            console.warn("⚠️ Batch prediction failed; using AI-only suggestions:", e);
          }
        }

        result = analyses;
      }

      setState({ status: "success", data: result, error: null });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setState({ status: "error", data: null, error: errorMessage });
    }
  };

  const WelcomeMessage = () => (
    <div className="text-center p-8 rounded-lg bg-dark-card border border-dark-border mt-8">
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to PredictGenie</h2>
      <p className="text-dark-text-secondary">
        Analyze prices by URL or upload a CSV for batch analysis to get AI + ML powered pricing suggestions.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <ProductInputForm onAnalyze={handleAnalysis} isLoading={state.status === "loading"} />

        {state.status === "loading" && (
          <div className="flex justify-center items-center mt-8">
            <LoadingSpinner />
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-8 text-center p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg">
            <p className="font-bold text-lg mb-2">Analysis Failed</p>
            <p className="whitespace-pre-wrap">{state.error}</p>
          </div>
        )}

        {state.status === "success" && state.data && (
          <ResultsDisplay result={state.data} />
        )}

        {state.status === "idle" && <WelcomeMessage />}
      </main>
      <Footer />
    </div>
  );
};

export default App;
