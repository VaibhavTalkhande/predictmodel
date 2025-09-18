import type { ProductAnalysis } from "../types";
import type { PredictPayload } from "./priceService";

/**
 * Try to infer category from product name
 */
export function inferCategory(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("shoe") || n.includes("sneaker")) return "footwear";
  if (n.includes("phone") || n.includes("mobile")) return "electronics";
  if (n.includes("shirt") || n.includes("t-shirt")) return "apparel";
  return "general";
}

/**
 * Strict number parser
 * - Rejects non-numeric strings (like "123abc")
 * - Returns `null` if invalid
 */
function parseStrictNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return null;
}

/**
 * Map single analysis → ML predict payload
 */
export function analysisToPredictPayload(a: ProductAnalysis): PredictPayload {
  const competitors = (a.competitors ?? [])
    .map((c) => parseStrictNumber(c.price))
    .filter((v): v is number => v !== null);

  const userPrice = parseStrictNumber(a.userProduct.currentPrice);

  return {
    current_price: userPrice ?? 0,
    competitor_prices: competitors.length > 0
      ? competitors
      : [userPrice ?? 0], // always ensure at least 1
    category: inferCategory(a.userProduct.productName),
  };
}

/**
 * Map batch of analyses → list of ML predict payloads
 */
export function analysesToPredictPayloads(
  analyses: ProductAnalysis[]
): PredictPayload[] {
  return analyses.map(analysisToPredictPayload);
}
