import {
  getSymbolKind,
  supportedResolutions,
} from "@/components/stock-chart/config";
import type {
  ChartRange,
  TradingViewDataPoint,
  TradingViewSearchResult,
  UDFError,
} from "@/components/stock-chart/types";

export const createDatafeed = (symbol: string, activeRange: ChartRange) => {
  return {
    onReady: (cb: (config: unknown) => void) => {
      cb({
        supported_resolutions: supportedResolutions,
        supports_search: true,
        supports_group_request: false,
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    },
    searchSymbols: (
      userInput: string,
      _exchange: string,
      _type: string,
      onResultReadyCallback: (results: TradingViewSearchResult[]) => void
    ) => {
      const query = userInput.trim();
      if (!query) {
        onResultReadyCallback([]);
        return;
      }

      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((payload) => {
          const results = (payload?.results || [])
            .filter((item: { symbol?: string }) => Boolean(item?.symbol))
            .map((item: { symbol: string; name?: string; type?: string; exchange?: string }) => ({
              symbol: item.symbol.includes(":")
                ? item.symbol
                : item.exchange
                  ? `${item.exchange}:${item.symbol}`
                  : item.symbol,
              full_name: item.symbol,
              description: item.name || item.symbol,
              exchange: item.exchange || "",
              ticker: item.symbol,
              type: (item.type || "stock").toLowerCase(),
            })) as TradingViewSearchResult[];
          onResultReadyCallback(results.slice(0, 30));
        })
        .catch(() => {
          onResultReadyCallback([]);
        });
    },
    resolveSymbol: (
      _symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: Record<string, unknown>) => void,
      onResolveErrorCallback: (error: UDFError) => void
    ) => {
      try {
        const kind = getSymbolKind(symbol);
        const isCrypto = kind === "crypto";
        const isFuture = kind === "future";
        const exchange = isCrypto ? "crypto" : isFuture ? "CME" : "NASDAQ";
        onSymbolResolvedCallback({
          name: symbol,
          ticker: symbol,
          description: symbol,
          type: isCrypto ? "crypto" : isFuture ? "futures" : "stock",
          session: isCrypto || isFuture ? "24x7" : "0930-1600",
          timezone: "America/New_York",
          exchange,
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          intraday_multipliers: ["1", "5", "15", "30", "60"],
          supported_resolutions: supportedResolutions,
          has_weekly_and_monthly: true,
          volume_precision: 2,
          data_status: "streamable",
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to resolve symbol info";
        onResolveErrorCallback({ code: 1, message });
      }
    },
    getBars: async (
      _symbolInfo: unknown,
      _resolution: string,
      _from: number,
      _to: number,
      _firstDataRequest: boolean,
      onHistoryCallback: (
        bars: TradingViewDataPoint[],
        info: { noData: boolean }
      ) => void,
      onErrorCallback: (error: UDFError) => void
    ) => {
      try {
        const response = await fetch(
          `/api/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(activeRange)}`,
          {
            cache: "no-store",
          }
        );
        const payload = await response.json();
        const bars: TradingViewDataPoint[] = Array.isArray(payload?.data)
          ? payload.data
              .map((bar: Record<string, unknown>) => {
                const rawTime = bar.time;
                const time =
                  typeof rawTime === "number"
                    ? rawTime
                    : typeof rawTime === "string"
                    ? Math.floor(new Date(`${rawTime}T00:00:00Z`).getTime() / 1000)
                    : NaN;

                return {
                  time,
                  open: Number(bar.open),
                  high: Number(bar.high),
                  low: Number(bar.low),
                  close: Number(bar.close),
                  volume: Number(bar.volume || 0),
                };
              })
              .filter(
                (bar: TradingViewDataPoint) =>
                  Number.isFinite(bar.time) &&
                  Number.isFinite(bar.open) &&
                  Number.isFinite(bar.high) &&
                  Number.isFinite(bar.low) &&
                  Number.isFinite(bar.close)
              )
              .sort((a: TradingViewDataPoint, b: TradingViewDataPoint) => a.time - b.time)
          : [];

        if (!response.ok || bars.length === 0) {
          onHistoryCallback([], { noData: true });
          return;
        }

        onHistoryCallback(bars, { noData: false });
      } catch {
        onErrorCallback({ code: 1, message: "Failed to load bars" });
      }
    },
    subscribeBars: () => {},
    unsubscribeBars: () => {},
    getServerTime: (cb: (time: number) => void) => cb(Math.floor(Date.now() / 1000)),
  };
};
