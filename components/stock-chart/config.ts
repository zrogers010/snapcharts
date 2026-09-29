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

/**
 * Map Yahoo futures symbols to TradingView continuous contract symbols.
 * TradingView's hosted widget validates symbols against its database,
 * so we must provide valid TradingView symbols even though it will use
 * TradingView's data feed (not our custom Yahoo datafeed) - accepted tradeoff.
 */
const yahooToTVFuturesMap: Record<string, string> = {
  // Energy
  "CL=F": "NYMEX:CL1!",    // Crude Oil WTI
  "NG=F": "NYMEX:NG1!",    // Natural Gas
  "RB=F": "NYMEX:RB1!",    // RBOB Gasoline
  "HO=F": "NYMEX:HO1!",    // Heating Oil
  
  // Indices
  "ES=F": "CME_MINI:ES1!", // S&P 500 E-mini
  "NQ=F": "CME_MINI:NQ1!", // Nasdaq 100 E-mini
  "YM=F": "CBOT:YM1!",     // Dow Jones E-mini
  "RTY=F": "CME_MINI:RTY1!", // Russell 2000 E-mini
  
  // Metals
  "GC=F": "COMEX:GC1!",    // Gold
  "SI=F": "COMEX:SI1!",    // Silver
  "HG=F": "COMEX:HG1!",    // Copper
  "PL=F": "NYMEX:PL1!",    // Platinum
  
  // Agriculture
  "ZC=F": "CBOT:ZC1!",     // Corn
  "ZS=F": "CBOT:ZS1!",     // Soybeans
  "ZW=F": "CBOT:ZW1!",     // Wheat
  "KC=F": "NYBOT:KC1!",    // Coffee
  "SB=F": "NYBOT:SB1!",    // Sugar
  "CT=F": "NYBOT:CT1!",    // Cotton
  
  // Treasuries
  "ZN=F": "CBOT:ZN1!",     // 10-Year T-Note
  "ZB=F": "CBOT:ZB1!",     // 30-Year T-Bond
  "ZT=F": "CBOT:ZT1!",     // 2-Year T-Note
  "ZF=F": "CBOT:ZF1!",     // 5-Year T-Note
  
  // Currencies (FX futures)
  "6E=F": "CME:6E1!",      // Euro FX
  "6B=F": "CME:6B1!",      // British Pound
  "6J=F": "CME:6J1!",      // Japanese Yen
  "6C=F": "CME:6C1!",      // Canadian Dollar
};

/**
 * Convert Yahoo symbol to TradingView-compatible symbol for widget initialization.
 * For futures, maps to TradingView continuous contract symbols.
 * For stocks and crypto, returns unchanged.
 */
export const toTradingViewSymbol = (yahooSymbol: string): string => {
  // Check if this is a known futures symbol with a TradingView mapping
  const tvFuture = yahooToTVFuturesMap[yahooSymbol];
  if (tvFuture) {
    return tvFuture;
  }
  
  // For unmapped futures (generic fallback), just return as-is
  // Stocks (AAPL) and crypto (BTC-USD) work without transformation
  return yahooSymbol;
};

/**
 * Extract the base symbol for display purposes.
 * Removes exchange prefix from TradingView symbols.
 */
export const getTradingViewDisplaySymbol = (tvSymbol: string): string => {
  // Extract symbol after colon (e.g., "NYMEX:CL1!" -> "CL1!")
  const parts = tvSymbol.split(":");
  return parts.length > 1 ? parts[1] : tvSymbol;
};

export const getSymbolKind = (symbol: string): "stock" | "crypto" | "future" => {
  const upper = symbol.toUpperCase();
  if (upper.includes("-")) return "crypto";
  if (upper.endsWith("=F") || upper.endsWith(".F") || upper.includes("^")) return "future";
  return "stock";
};
