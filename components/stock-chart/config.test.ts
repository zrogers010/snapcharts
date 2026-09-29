import { describe, it, expect } from "vitest";
import { normalizeTVSymbol, denormalizeTVSymbol, getSymbolKind } from "@/components/stock-chart/config";

describe("TradingView symbol normalization for futures", () => {
  const futuresSymbols = [
    { yahoo: "CL=F", tv: "CL_F", name: "Crude Oil" },
    { yahoo: "ES=F", tv: "ES_F", name: "S&P 500" },
    { yahoo: "NQ=F", tv: "NQ_F", name: "Nasdaq" },
    { yahoo: "GC=F", tv: "GC_F", name: "Gold" },
    { yahoo: "ZN=F", tv: "ZN_F", name: "10-Year T-Note" },
  ];

  const cryptoSymbols = [
    { symbol: "BTC-USD", name: "Bitcoin" },
    { symbol: "ETH-USD", name: "Ethereum" },
    { symbol: "SOL-USD", name: "Solana" },
  ];

  const stockSymbols = [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "TSLA", name: "Tesla" },
  ];

  it("should normalize Yahoo futures symbols for TradingView", () => {
    futuresSymbols.forEach(({ yahoo, tv, name }) => {
      const normalized = normalizeTVSymbol(yahoo);
      expect(normalized).toBe(tv);
      console.log(`✓ ${name}: ${yahoo} → ${tv}`);
    });
  });

  it("should denormalize TradingView symbols back to Yahoo format", () => {
    futuresSymbols.forEach(({ yahoo, tv, name }) => {
      const denormalized = denormalizeTVSymbol(tv);
      expect(denormalized).toBe(yahoo);
      console.log(`✓ ${name}: ${tv} → ${yahoo}`);
    });
  });

  it("should correctly identify futures symbols", () => {
    futuresSymbols.forEach(({ yahoo, name }) => {
      expect(getSymbolKind(yahoo)).toBe("future");
      console.log(`✓ ${name} (${yahoo}) identified as future`);
    });
  });

  it("should correctly identify crypto symbols", () => {
    cryptoSymbols.forEach(({ symbol, name }) => {
      expect(getSymbolKind(symbol)).toBe("crypto");
      console.log(`✓ ${name} (${symbol}) identified as crypto`);
    });
  });

  it("should correctly identify stock symbols", () => {
    stockSymbols.forEach(({ symbol, name }) => {
      expect(getSymbolKind(symbol)).toBe("stock");
      console.log(`✓ ${name} (${symbol}) identified as stock`);
    });
  });

  it("should not modify crypto symbols during normalization", () => {
    cryptoSymbols.forEach(({ symbol }) => {
      expect(normalizeTVSymbol(symbol)).toBe(symbol);
    });
  });

  it("should not modify stock symbols during normalization", () => {
    stockSymbols.forEach(({ symbol }) => {
      expect(normalizeTVSymbol(symbol)).toBe(symbol);
    });
  });

  it("should handle round-trip normalization correctly", () => {
    futuresSymbols.forEach(({ yahoo }) => {
      const normalized = normalizeTVSymbol(yahoo);
      const denormalized = denormalizeTVSymbol(normalized);
      expect(denormalized).toBe(yahoo);
    });
  });
});

describe("URL encoding for API calls", () => {
  const testSymbols = [
    { raw: "CL=F", encoded: "CL%3DF", name: "Crude Oil futures" },
    { raw: "ES=F", encoded: "ES%3DF", name: "S&P 500 futures" },
    { raw: "BTC-USD", encoded: "BTC-USD", name: "Bitcoin" },
    { raw: "AAPL", encoded: "AAPL", name: "Apple" },
  ];

  it("should correctly encode symbols for URL paths", () => {
    testSymbols.forEach(({ raw, encoded, name }) => {
      const result = encodeURIComponent(raw);
      expect(result).toBe(encoded);
      console.log(`✓ ${name}: ${raw} → ${result}`);
    });
  });

  it("should create valid API URLs with encoded symbols", () => {
    testSymbols.forEach(({ raw, encoded }) => {
      const quoteUrl = `/api/quote/${encodeURIComponent(raw)}`;
      const chartUrl = `/api/chart/${encodeURIComponent(raw)}`;
      
      expect(quoteUrl).toBe(`/api/quote/${encoded}`);
      expect(chartUrl).toBe(`/api/chart/${encoded}`);
    });
  });
});
