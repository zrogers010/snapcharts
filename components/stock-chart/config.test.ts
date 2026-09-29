import { describe, it, expect } from "vitest";
import { toTradingViewSymbol, getTradingViewDisplaySymbol, getSymbolKind } from "@/components/stock-chart/config";

describe("TradingView symbol mapping for futures", () => {
  const futuresSymbols = [
    { yahoo: "CL=F", tv: "NYMEX:CL1!", display: "CL1!", name: "Crude Oil" },
    { yahoo: "ES=F", tv: "CME_MINI:ES1!", display: "ES1!", name: "S&P 500" },
    { yahoo: "NQ=F", tv: "CME_MINI:NQ1!", display: "NQ1!", name: "Nasdaq" },
    { yahoo: "GC=F", tv: "COMEX:GC1!", display: "GC1!", name: "Gold" },
    { yahoo: "ZN=F", tv: "CBOT:ZN1!", display: "ZN1!", name: "10-Year T-Note" },
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

  it("should map Yahoo futures symbols to TradingView continuous contracts", () => {
    futuresSymbols.forEach(({ yahoo, tv, name }) => {
      const mapped = toTradingViewSymbol(yahoo);
      expect(mapped).toBe(tv);
      console.log(`✓ ${name}: ${yahoo} → ${tv}`);
    });
  });

  it("should extract display symbol from TradingView symbol", () => {
    futuresSymbols.forEach(({ tv, display, name }) => {
      const displaySymbol = getTradingViewDisplaySymbol(tv);
      expect(displaySymbol).toBe(display);
      console.log(`✓ ${name}: ${tv} → ${display}`);
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

  it("should not modify crypto symbols during mapping", () => {
    cryptoSymbols.forEach(({ symbol }) => {
      expect(toTradingViewSymbol(symbol)).toBe(symbol);
    });
  });

  it("should not modify stock symbols during mapping", () => {
    stockSymbols.forEach(({ symbol }) => {
      expect(toTradingViewSymbol(symbol)).toBe(symbol);
    });
  });

  it("should preserve Yahoo symbols for API calls (separate concern)", () => {
    // This test documents that the Yahoo symbol is preserved in the datafeed
    // for API calls, while the TradingView symbol is only for widget init
    futuresSymbols.forEach(({ yahoo }) => {
      // In the actual implementation, datafeed receives both symbols
      // and uses Yahoo symbol for /api/chart calls
      const apiSymbol = yahoo; // Would be used in: /api/chart/${encodeURIComponent(yahooSymbol)}
      expect(apiSymbol).toContain("=F");
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
