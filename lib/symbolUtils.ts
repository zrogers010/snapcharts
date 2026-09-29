/**
 * Symbol utilities for handling Yahoo Finance tickers in URLs and TradingView.
 * 
 * Yahoo Finance uses special characters in symbols (e.g., CL=F for futures, BTC-USD for crypto)
 * that need different handling for URLs vs TradingView widget.
 */

/**
 * Safely decode a URI component, returning the original if decoding fails.
 */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Normalize a route parameter to extract the symbol.
 * Handles Next.js decoded params and exchange prefixes (e.g., "NASDAQ:AAPL" → "AAPL").
 */
export function normalizeRouteSymbol(routeParam: string): string {
  return safeDecodeURIComponent(routeParam)
    .toUpperCase()
    .trim()
    .split(":")
    .pop() || "";
}

/**
 * Build a URL-safe API path with properly encoded symbol.
 * Use this for all fetch calls to /api/quote/, /api/chart/, /api/news/, etc.
 * 
 * @example
 * buildAPIPath("/api/quote", "CL=F") → "/api/quote/CL%3DF"
 * buildAPIPath("/api/chart", "BTC-USD", "?range=1y") → "/api/chart/BTC-USD?range=1y"
 */
export function buildAPIPath(base: string, symbol: string, query: string = ""): string {
  return `${base}/${encodeURIComponent(symbol)}${query}`;
}
