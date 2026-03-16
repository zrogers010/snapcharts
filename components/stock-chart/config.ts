import type { ChartRange } from "@/components/stock-chart/types";

export const timeRanges = [
  { label: "1D", value: "1d" as ChartRange },
  { label: "5D", value: "5d" as ChartRange },
  { label: "1M", value: "1mo" as ChartRange },
  { label: "3M", value: "3mo" as ChartRange },
  { label: "6M", value: "6mo" as ChartRange },
  { label: "1Y", value: "1y" as ChartRange },
  { label: "5Y", value: "5y" as ChartRange },
];

export const rangeWindowSeconds: Record<ChartRange, number> = {
  "1d": 1 * 24 * 60 * 60,
  "5d": 5 * 24 * 60 * 60,
  "1mo": 31 * 24 * 60 * 60,
  "3mo": 92 * 24 * 60 * 60,
  "6mo": 183 * 24 * 60 * 60,
  "1y": 366 * 24 * 60 * 60,
  "5y": 5 * 366 * 24 * 60 * 60,
};

export const rangeToResolution: Record<ChartRange, string> = {
  "1d": "5",
  "5d": "15",
  "1mo": "30",
  "3mo": "60",
  "6mo": "120",
  "1y": "1W",
  "5y": "1W",
};

export const supportedResolutions = ["1", "5", "15", "30", "60", "120", "1D", "1W", "1M"];

export const buildTimeframe = (range: ChartRange) => {
  const to = Math.floor(Date.now() / 1000);
  const from = Math.max(1, to - rangeWindowSeconds[range]);
  return { from, to };
};

export const cleanSymbol = (symbol: string) => {
  return (
    symbol
      .trim()
      .toUpperCase()
      .split(":")
      .pop() || ""
  );
};

export const getSymbolKind = (symbol: string): "stock" | "crypto" | "future" => {
  const upper = symbol.toUpperCase();
  if (upper.includes("-")) return "crypto";
  if (upper.endsWith("=F") || upper.endsWith(".F") || upper.includes("^")) return "future";
  return "stock";
};
