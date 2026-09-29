import { describe, it, expect } from "vitest";
import { safeDecodeURIComponent, normalizeRouteSymbol, buildAPIPath } from "./symbolUtils";

describe("Symbol utilities", () => {
  describe("safeDecodeURIComponent", () => {
    it("should decode valid URI components", () => {
      expect(safeDecodeURIComponent("CL%3DF")).toBe("CL=F");
      expect(safeDecodeURIComponent("BTC-USD")).toBe("BTC-USD");
      expect(safeDecodeURIComponent("AAPL")).toBe("AAPL");
    });

    it("should return original value for invalid URI components", () => {
      const invalid = "%%invalid%%";
      expect(safeDecodeURIComponent(invalid)).toBe(invalid);
    });
  });

  describe("normalizeRouteSymbol", () => {
    it("should extract symbol from route param", () => {
      expect(normalizeRouteSymbol("CL%3DF")).toBe("CL=F");
      expect(normalizeRouteSymbol("CL=F")).toBe("CL=F");
      expect(normalizeRouteSymbol("AAPL")).toBe("AAPL");
    });

    it("should handle exchange prefixes", () => {
      expect(normalizeRouteSymbol("NASDAQ:AAPL")).toBe("AAPL");
      expect(normalizeRouteSymbol("NYSE:TSLA")).toBe("TSLA");
    });

    it("should uppercase and trim", () => {
      expect(normalizeRouteSymbol("  aapl  ")).toBe("AAPL");
      expect(normalizeRouteSymbol("btc-usd")).toBe("BTC-USD");
    });
  });

  describe("buildAPIPath", () => {
    it("should build URL-safe API paths", () => {
      expect(buildAPIPath("/api/quote", "CL=F")).toBe("/api/quote/CL%3DF");
      expect(buildAPIPath("/api/chart", "ES=F")).toBe("/api/chart/ES%3DF");
      expect(buildAPIPath("/api/news", "BTC-USD")).toBe("/api/news/BTC-USD");
    });

    it("should handle query strings", () => {
      expect(buildAPIPath("/api/chart", "CL=F", "?range=1y"))
        .toBe("/api/chart/CL%3DF?range=1y");
      expect(buildAPIPath("/api/quote", "AAPL", "?fields=price"))
        .toBe("/api/quote/AAPL?fields=price");
    });

    it("should work without query strings", () => {
      expect(buildAPIPath("/api/quote", "NVDA")).toBe("/api/quote/NVDA");
    });
  });
});
