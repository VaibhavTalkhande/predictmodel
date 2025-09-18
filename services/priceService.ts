const API_URL = process.env.VITE_API_URL ?? "http://localhost:8000";

export type PredictPayload = {
  current_price: number;
  competitor_prices: number[];
  category: string;
};

export async function predictPrice(payload: PredictPayload): Promise<number> {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({} as any));
    const msg =
      typeof detail?.detail === "string"
        ? detail.detail
        : `Prediction failed (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const value = Array.isArray(data.predicted_price)
    ? data.predicted_price[0]
    : data.predicted_price;
  return Number(value);
}

export async function predictBatch(payloads: PredictPayload[]): Promise<number[]> {
  const res = await fetch(`${API_URL}/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // ✅ send array directly (not { items: ... })
    body: JSON.stringify(payloads),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({} as any));
    const msg =
      typeof detail?.detail === "string"
        ? detail.detail
        : `Batch prediction failed (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.predicted_prices as number[];
}
