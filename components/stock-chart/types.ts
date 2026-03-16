export type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y";

export type TradingViewWindow = Window & {
  TradingView?: {
    widget: new (config: Record<string, unknown>) => TradingViewWidget;
  };
};

export interface TradingViewWidget {
  onChartReady: (cb: () => void) => void;
  remove: () => void;
  activeChart?: () => unknown;
  chart?: (index?: number) => unknown;
  takeClientScreenshot?: (...args: unknown[]) => unknown;
  takeScreenshot?: (...args: unknown[]) => unknown;
  getScreenshot?: (...args: unknown[]) => unknown;
  image?: (...args: unknown[]) => unknown;
  imageCanvas?: (...args: unknown[]) => unknown;
  subscribe?: (event: string, callback: (arg: unknown) => void) => void;
  unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
  postMessage?: {
    get?: (
      path: string,
      payload: Record<string, unknown> | null,
      cb: (arg: unknown) => void
    ) => void;
  };
}

export interface TradingViewDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingViewSearchResult {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: string;
}

export interface UDFError {
  code: number;
  message: string;
}
