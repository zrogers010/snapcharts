"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y";

type TradingViewWindow = Window & {
  TradingView?: {
    widget: new (config: Record<string, unknown>) => TradingViewWidget;
  };
};

interface TradingViewWidget {
  onChartReady: (cb: () => void) => void;
  remove: () => void;
  activeChart?: () => unknown;
  chart?: (index?: number) => unknown;
  takeClientScreenshot?: (options?: Record<string, unknown>) => Promise<HTMLCanvasElement> | HTMLCanvasElement;
  takeScreenshot?: (...args: unknown[]) => unknown;
  getScreenshot?: () => unknown;
  image?: (...args: unknown[]) => unknown;
  imageCanvas?: (...args: unknown[]) => unknown;
  subscribe?: (event: string, callback: (arg: unknown) => void) => void;
  unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
  postMessage?: {
    get?: (path: string, payload: Record<string, unknown> | null, cb: (arg: unknown) => void) => void;
  };
}

interface TradingViewDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingViewSearchResult {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: string;
}

interface UDFError {
  code: number;
  message: string;
}

const timeRanges = [
  { label: "1D", value: "1d" as ChartRange },
  { label: "5D", value: "5d" as ChartRange },
  { label: "1M", value: "1mo" as ChartRange },
  { label: "3M", value: "3mo" as ChartRange },
  { label: "6M", value: "6mo" as ChartRange },
  { label: "1Y", value: "1y" as ChartRange },
  { label: "5Y", value: "5y" as ChartRange },
];

const rangeWindowSeconds: Record<ChartRange, number> = {
  "1d": 1 * 24 * 60 * 60,
  "5d": 5 * 24 * 60 * 60,
  "1mo": 31 * 24 * 60 * 60,
  "3mo": 92 * 24 * 60 * 60,
  "6mo": 183 * 24 * 60 * 60,
  "1y": 366 * 24 * 60 * 60,
  "5y": 5 * 366 * 24 * 60 * 60,
};

const normalizeTimestamp = (value: number) =>
  Math.abs(value) > 2e11 ? Math.floor(value / 1000) : Math.floor(value);

const cleanSymbol = (symbol: string) => {
  return (
    symbol
      .trim()
      .toUpperCase()
      .split(":")
      .pop() || ""
  );
};

const rangeToResolution: Record<ChartRange, string> = {
  "1d": "5",
  "5d": "15",
  "1mo": "1D",
  "3mo": "1D",
  "6mo": "1D",
  "1y": "1D",
  "5y": "1W",
};

const supportedResolutions = ["1", "5", "15", "30", "60", "1D", "1W", "1M"];

const createDatafeed = (symbol: string, activeRange: ChartRange) => {
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
        const isCrypto = symbol.includes("-");
        onSymbolResolvedCallback({
          name: symbol,
          ticker: symbol,
          description: symbol,
          type: isCrypto ? "crypto" : "stock",
          session: isCrypto ? "24x7" : "0930-1600",
          timezone: "America/New_York",
          exchange: isCrypto ? "crypto" : "NASDAQ",
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
      resolution: string,
      from: number,
      to: number,
      _firstDataRequest: boolean,
      onHistoryCallback: (bars: TradingViewDataPoint[], info: { noData: boolean }) => void,
      onErrorCallback: (error: UDFError) => void
    ) => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const safeTo = Math.min(normalizeTimestamp(to), now);
        const safeFrom = Math.max(
          normalizeTimestamp(from),
          Math.floor(safeTo - rangeWindowSeconds[activeRange])
        );
        const params = new URLSearchParams({
          symbol,
          from: `${safeFrom}`,
          to: `${safeTo}`,
          resolution,
        });

        const response = await fetch(`/api/tradingview/bars?${params.toString()}`);
        const payload = await response.json();
        const bars: TradingViewDataPoint[] = payload.bars || [];

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

const loadTradingViewScript = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject();

  const win = window as TradingViewWindow;
  const existing = document.getElementById("tradingview-widget-script");

  if (win.TradingView?.widget) {
    return Promise.resolve();
  }

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("TradingView script failed to load"))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "tradingview-widget-script";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("TradingView script failed to load"));
    document.head.appendChild(script);
  });
};

export default function StockChart({ symbol }: { symbol: string }) {
  const tickerSymbol = useMemo(() => cleanSymbol(symbol), [symbol]);
  const chartContainerId = useMemo(
    () =>
      `tv-chart-container-${tickerSymbol
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .toLowerCase()}`,
    [tickerSymbol]
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TradingViewWidget | null>(null);
  const [activeRange, setActiveRange] = useState<ChartRange>("1y");
  const [isLoading, setIsLoading] = useState(false);
  const isRemovingRef = useRef(false);
  const isChartReadyRef = useRef(false);
  const buildIdRef = useRef(0);

  const supportedRange = useMemo(
    () =>
      timeRanges.map((range) => ({
        ...range,
        resolution: rangeToResolution[range.value],
      })),
    []
  );

  const buildChart = async (buildId: number) => {
    if (!chartContainerRef.current) return;

    if (widgetRef.current) {
      safeRemoveWidget();
    }
    chartContainerRef.current.innerHTML = "";

    setIsLoading(true);

    try {
      await loadTradingViewScript();
      if (buildId !== buildIdRef.current) return;
      const win = window as TradingViewWindow;
      if (!win.TradingView?.widget || !chartContainerRef.current) {
        setIsLoading(false);
        return;
      }

      const widget = new win.TradingView.widget({
        autosize: true,
        symbol: tickerSymbol,
        interval: rangeToResolution[activeRange],
        timezone: "America/New_York",
        theme: "Dark",
        locale: "en",
        toolbar_bg: "#09090b",
        hide_top_toolbar: true,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: chartContainerId,
        datafeed: createDatafeed(tickerSymbol, activeRange),
        disabled_features: [
          "chart_scroll",
          "chart_scroll_zoom",
          "mouse_wheel_scroll",
          "mouse_wheel_zoom",
          "header_symbol_search",
          "header_compare",
          "header_fullscreen_button",
          "header_saveload",
          "header_settings",
          "header_indicators",
          "header_chart_type",
          "header_undo_redo",
          "header_screenshot",
          "timeframes_toolbar",
        ],
        enabled_features: [
          "left_toolbar",
        ],
      }) as TradingViewWidget;

      widgetRef.current = widget;
      widget.onChartReady(() => {
        if (buildId !== buildIdRef.current) {
          return;
        }
        isChartReadyRef.current = true;
        setIsLoading(false);
      });
    } catch {
      isChartReadyRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const buildId = ++buildIdRef.current;
    isChartReadyRef.current = false;

    const start = async () => {
      await buildChart(buildId);
      if (!mounted) {
        if (widgetRef.current && buildId === buildIdRef.current) {
          safeRemoveWidget();
        }
      }
    };

    start();

    return () => {
      mounted = false;
      if (widgetRef.current && buildId === buildIdRef.current) {
        safeRemoveWidget();
      }
    };
  }, [tickerSymbol, activeRange]);

  useEffect(() => {
    const chartNode = chartContainerRef.current;
    if (!chartNode) return;

    const blockWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const blockGesture = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const blockTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1 || event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    chartNode.addEventListener("wheel", blockWheel, { passive: false });
    chartNode.addEventListener("touchmove", blockTouchMove, { passive: false });
    chartNode.addEventListener("gesturestart", blockGesture, { passive: false });
    chartNode.addEventListener("gesturechange", blockGesture, { passive: false });

    return () => {
      chartNode.removeEventListener("wheel", blockWheel);
      chartNode.removeEventListener("touchmove", blockTouchMove);
      chartNode.removeEventListener("gesturestart", blockGesture);
      chartNode.removeEventListener("gesturechange", blockGesture);
    };
  }, [tickerSymbol, activeRange]);

  const safeRemoveWidget = () => {
    const widget = widgetRef.current;
    if (!widget || isRemovingRef.current) return;

    isRemovingRef.current = true;
    try {
      widget.remove();
    } catch {
      // TradingView may throw when DOM nodes already detached.
    } finally {
      widgetRef.current = null;
      isRemovingRef.current = false;
    }
  };

  const downloadScreenshot = async () => {
    if (!widgetRef.current || !chartContainerRef.current) return;
    const widget = widgetRef.current as TradingViewWidget & {
      onChartReady?: (cb: () => void) => void;
    };
    const captureSuffix = `${Math.floor(Date.now() / 1000)}`;
    const safeSymbol = tickerSymbol.replace(/[^a-zA-Z0-9-_]/g, "_");
    const triggerDownload = (url: string) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeSymbol.toUpperCase()}_${activeRange}_${captureSuffix}.png`;
      link.rel = "noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => link.remove(), 0);
    };

    if (!isChartReadyRef.current) {
      if (typeof widget.onChartReady === "function") {
        await new Promise<void>((resolve) => {
          widget.onChartReady?.(() => {
            isChartReadyRef.current = true;
            resolve();
          });
        });
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
      }
    }

    if (!widgetRef.current) return;

    const chartingWidget = widgetRef.current as TradingViewWidget & {
      activeChart?: () => {
        takeClientScreenshot?: (...args: unknown[]) => unknown;
        takeScreenshot?: (...args: unknown[]) => unknown;
        subscribe?: (event: string, callback: (arg: unknown) => void) => void;
        unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
      };
      chart?: (index?: number) => {
        takeClientScreenshot?: (...args: unknown[]) => unknown;
        takeScreenshot?: (...args: unknown[]) => unknown;
        subscribe?: (event: string, callback: (arg: unknown) => void) => void;
        unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
      };
    };

    const toDataUrl = async (shot: unknown): Promise<string | undefined> => {
      const formatCreatedLabel = () =>
        `Created on ${new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date())}`;

      const stampCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
        const output = document.createElement("canvas");
        output.width = canvas.width;
        output.height = canvas.height;
        const ctx = output.getContext("2d");
        if (!ctx) return canvas;

        ctx.drawImage(canvas, 0, 0);

        const footerHeight = Math.max(30, Math.min(72, Math.round(output.height * 0.06)));
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, output.height - footerHeight, output.width, footerHeight);

        const headerHeight = Math.min(44, Math.round(output.height * 0.045));
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, output.width, headerHeight);

        ctx.fillStyle = "#d4d4d8";
        const fontSize = Math.max(11, Math.min(18, headerHeight - 6));
        ctx.font = `${500} ${fontSize}px "Inter", Arial, sans-serif`;
        ctx.textBaseline = "middle";
        const label = formatCreatedLabel();
        const metrics = ctx.measureText(label);
        const textY = headerHeight / 2;
        const maxTextWidth = Math.max(1, output.width - 24);
        const scale = Math.min(1, maxTextWidth / Math.max(1, metrics.width));
        ctx.save();
        ctx.translate(12, textY);
        ctx.scale(scale, 1);
        ctx.fillText(label, 0, 0);
        ctx.restore();

        return output;
      };

      if (!shot) return;
      if (typeof shot === "string") {
        if (shot.startsWith("data:") || shot.startsWith("blob:") || shot.startsWith("http")) {
          return shot;
        }
        return `data:image/png;base64,${shot}`;
      }
      if (shot instanceof HTMLCanvasElement) {
        return stampCanvas(shot).toDataURL("image/png");
      }
      if (shot instanceof Blob) {
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(shot);
        });
      }
      if (shot instanceof ArrayBuffer) {
        const blob = new Blob([shot], { type: "image/png" });
        return await toDataUrl(blob);
      }
      if (typeof shot === "object") {
        const payload = shot as Record<string, unknown>;
        if (typeof payload.base64 === "string") {
          return payload.base64.startsWith("data:")
            ? payload.base64
            : `data:image/png;base64,${payload.base64}`;
        }
        if (typeof payload.data === "string") {
          const data = payload.data;
          return data.startsWith("data:") ? data : `data:image/png;base64,${data}`;
        }
        if (typeof payload.dataURL === "string") return payload.dataURL;
        if (typeof payload.dataUri === "string") return payload.dataUri;
        if (typeof payload.dataURI === "string") return payload.dataURI;
        if (typeof payload.image === "string") return payload.image;
        if (payload.blob instanceof Blob) {
          return await toDataUrl(payload.blob);
        }
        if (typeof payload.blob === "string") {
          return payload.blob.startsWith("data:")
            ? payload.blob
            : `data:image/png;base64,${payload.blob}`;
        }
        if (typeof payload.content === "string") return payload.content;
        if (typeof payload.snapshot === "string") return payload.snapshot;
      }
    };

      const invokeCaptureMethod = async (
        method?: (...args: unknown[]) => unknown,
      owner?: object,
      preferredArgSets: unknown[][] = []
    ): Promise<string | undefined> => {
      if (typeof method !== "function") return;

      const callArgsList = preferredArgSets.length ? preferredArgSets : [[]];

      const callWithArgs = async (callArgs: unknown[]): Promise<string | undefined> => {
        try {
          const direct = await Promise.resolve(
            (method as (...args: unknown[]) => unknown).apply(owner, callArgs)
          );
          return toDataUrl(direct);
        } catch {
          return;
        }
      };

      for (const args of callArgsList) {
        const preferredResult = await callWithArgs(args);
        if (preferredResult) return preferredResult;
      }

      const normalizeResult = async (value: unknown): Promise<string | undefined> => {
        if (value === undefined) return;
        const direct = await toDataUrl(value);
        if (direct) return direct;

        if (value instanceof Promise) {
          try {
            return await toDataUrl(await value);
          } catch {
            return;
          }
        }
        return;
      };

      const invokeWithArgs = async (args: unknown[]): Promise<string | undefined> => {
        return await new Promise<string | undefined>((resolve) => {
          let settled = false;
          const timeout = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve(undefined);
          }, 4000);

          const done = async (value: unknown) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            resolve(await normalizeResult(value));
          };

          const callArgs = args.map((arg) =>
            typeof arg === "function" ? done : arg
          );

          try {
            const direct = (method as (...args: unknown[]) => unknown).apply(owner, callArgs);
            if (direct !== undefined) {
              normalizeResult(direct).then((value) => {
                if (!settled && value) {
                  settled = true;
                  window.clearTimeout(timeout);
                  resolve(value);
                }
              });
            }
          } catch {
            window.clearTimeout(timeout);
            if (!settled) {
              settled = true;
              resolve(undefined);
            }
          }
        });
      };

      const callbackVariants: unknown[][] = [
        [(value: unknown) => value],
        [{ watermark: false }, (value: unknown) => value],
        [{}, (value: unknown) => value],
        [false, (value: unknown) => value],
        [null, (value: unknown) => value],
        [{ watermark: false, style: "light" }, (value: unknown) => value],
        [{}, false, (value: unknown) => value],
      ];

      for (const args of callbackVariants) {
        const callbackPayload = await invokeWithArgs(args);

        if (callbackPayload) return callbackPayload;
      }

      return;
    };

      const takeFromObject = async (target?: {
        takeClientScreenshot?: (...args: unknown[]) => unknown;
        takeScreenshot?: (...args: unknown[]) => unknown;
        getScreenshot?: (...args: unknown[]) => unknown;
        image?: (...args: unknown[]) => unknown;
      imageCanvas?: (...args: unknown[]) => unknown;
      subscribe?: (event: string, callback: (arg: unknown) => void) => void;
      unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
      }) => {
      if (!target) return;
      const imageCanvasResult = await invokeCaptureMethod(target.imageCanvas, target, [
        [{ watermark: false }],
        [{}],
      ]);
      if (imageCanvasResult) return imageCanvasResult;

      if (typeof target.takeClientScreenshot === "function") {
        try {
          const shot = await Promise.resolve(target.takeClientScreenshot());
          const dataUrl = await toDataUrl(shot);
          if (dataUrl) return dataUrl;
        } catch {
          // ignore
        }

        if (target.takeClientScreenshot.length >= 1) {
          try {
            const shot = await Promise.resolve(target.takeClientScreenshot({}));
            return toDataUrl(shot);
          } catch {
            // ignore
          }
        }
      }

      if (typeof target.getScreenshot === "function") {
        try {
          const shot = await Promise.resolve(target.getScreenshot());
          return toDataUrl(shot);
        } catch {
          // ignore
        }
      }

      return;
    };

    const screenshotFromEvent = async (target: {
      takeScreenshot?: (...args: unknown[]) => unknown;
      subscribe?: (event: string, callback: (arg: unknown) => void) => void;
      unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
    }) => {
      if (typeof target.takeScreenshot !== "function") return;
      const takeScreenshot = target.takeScreenshot;

      if (typeof target.subscribe !== "function" || typeof target.unsubscribe !== "function") {
        return;
      }

      return await new Promise<string | undefined>((resolve) => {
        let settled = false;
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          target.unsubscribe?.("onScreenshotReady", onReady);
          resolve(undefined);
        }, 5000);

        const finalize = async (value: unknown) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          target.unsubscribe?.("onScreenshotReady", onReady);
          resolve(await toDataUrl(value));
        };

        const onReady = async (value: unknown) => {
          try {
            await finalize(value);
          } catch {
            if (!settled) {
              settled = true;
              target.unsubscribe?.("onScreenshotReady", onReady);
              window.clearTimeout(timeout);
              resolve(undefined);
            }
          }
        };

        target.subscribe?.("onScreenshotReady", onReady);

        try {
          if (takeScreenshot.length >= 1) {
            takeScreenshot(onReady);
            return;
          }
          takeScreenshot();
        } catch {
          settled = true;
          target.unsubscribe?.("onScreenshotReady", onReady);
          window.clearTimeout(timeout);
          resolve(undefined);
        }
      });
    };

    const takeViaPostMessage = async (target: TradingViewWidget) => {
      if (!target?.postMessage?.get) return;

      const commands = ["takeScreenshot", "take_screenshot", "screenshot"];

      for (const command of commands) {
        const result = await new Promise<string | undefined>((resolve) => {
          const timeout = window.setTimeout(() => {
            window.clearTimeout(timeout);
            resolve(undefined);
          }, 3500);

          try {
            target.postMessage?.get?.(command, {}, (shot: unknown) => {
              window.clearTimeout(timeout);
              toDataUrl(shot).then((value) => resolve(value)).catch(() => resolve(undefined));
            });
          } catch {
            window.clearTimeout(timeout);
            resolve(undefined);
          }
        });

        if (result) return result;
      }

      return;
    };

    const takeDirect = async () => {
      return await takeFromObject(chartingWidget);
    };

    const takeChartObject = async () => {
      const chartObj =
        (chartingWidget.activeChart?.() as {
          takeClientScreenshot?: (...args: unknown[]) => unknown;
          takeScreenshot?: (...args: unknown[]) => unknown;
          subscribe?: (event: string, callback: (arg: unknown) => void) => void;
          unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
        }) ??
        (chartingWidget.chart?.() as {
          takeClientScreenshot?: (...args: unknown[]) => unknown;
          takeScreenshot?: (...args: unknown[]) => unknown;
          subscribe?: (event: string, callback: (arg: unknown) => void) => void;
          unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
        }) ??
        (chartingWidget.chart?.(0) as {
          takeClientScreenshot?: (...args: unknown[]) => unknown;
          takeScreenshot?: (...args: unknown[]) => unknown;
          subscribe?: (event: string, callback: (arg: unknown) => void) => void;
          unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
        });

      const chartResult = await takeFromObject(chartObj);
      if (chartResult) return chartResult;

      if (chartObj?.takeScreenshot) {
        const eventResult = await screenshotFromEvent(chartObj);
        if (eventResult) return eventResult;

        const shot = await Promise.resolve(chartObj.takeScreenshot());
        return toDataUrl(shot);
      }
      return;
    };

      const takeServer = async (target?: { takeScreenshot?: (...args: unknown[]) => unknown }) => {
      if (!target?.takeScreenshot) return;
      const takeScreenshot = target.takeScreenshot;

      const normalize = (value: unknown): string | undefined => {
        if (typeof value === "string") return value;
        if (typeof value === "object" && value) {
          const record = value as Record<string, unknown>;
          if (typeof record.url === "string") return record.url;
          if (typeof record.data === "string") return record.data;
          if (typeof record.image === "string") return record.image;
        }
        return undefined;
      };

      try {
        const direct = await Promise.resolve(takeScreenshot());
        const directUrl = await toDataUrl(direct);
        if (directUrl) return directUrl;
      } catch {
        // ignore and try callback form
      }

      return await new Promise<string | undefined>((resolve) => {
        const timer = window.setTimeout(() => {
          window.clearTimeout(timer);
          resolve(undefined);
        }, 4000);

        const resolveWith = (shot: unknown) => {
          window.clearTimeout(timer);
          resolve(normalize(shot));
        };

        try {
          if (takeScreenshot.length >= 1) {
            try {
              takeScreenshot(resolveWith);
              return;
            } catch {
              // fall through
            }
          }
          if (takeScreenshot.length >= 2) {
            takeScreenshot({}, resolveWith);
            return;
          }
        } catch {
          resolve(undefined);
          return;
        }

        resolve(undefined);
      });
    };

    const directResult = await takeDirect();
    if (directResult) {
      triggerDownload(directResult);
      return;
    }

    const chartObjResult = await takeChartObject();
    if (chartObjResult) {
      triggerDownload(chartObjResult);
      return;
    }

    const directEventResult = await screenshotFromEvent(chartingWidget);
    if (directEventResult) {
      triggerDownload(directEventResult);
      return;
    }

    const serverResult = await takeServer(chartingWidget);
    if (serverResult) {
      triggerDownload(serverResult);
      return;
    }

    const messageResult = await takeViaPostMessage(chartingWidget);
    if (messageResult) {
      triggerDownload(messageResult);
      return;
    }

    const chartServerResult = await takeServer(
      (chartingWidget.activeChart?.() as { takeScreenshot?: (...args: unknown[]) => unknown }) ??
      (chartingWidget.chart?.() as { takeScreenshot?: (...args: unknown[]) => unknown }) ??
      (chartingWidget.chart?.(0) as { takeScreenshot?: (...args: unknown[]) => unknown })
    );
    if (chartServerResult) {
      triggerDownload(chartServerResult);
      return;
    }

    const own = Object.keys(chartingWidget);
    const proto = Object.getPrototypeOf(chartingWidget) ?? {};
    const protoMethods = Object.getOwnPropertyNames(proto);
    console.warn(
      "SnapCharts screenshot unavailable. Available widget methods:",
      { own, protoMethods }
    );

    const canvases = Array.from(chartContainerRef.current.querySelectorAll("canvas"));
    if (canvases.length === 0) return;

    const bounds = chartContainerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.floor(bounds.width * dpr));
    output.height = Math.max(1, Math.floor(bounds.height * dpr));
    const ctx = output.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, bounds.width, bounds.height);

    canvases.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const x = rect.left - bounds.left;
      const y = rect.top - bounds.top;
      ctx.drawImage(canvas, x, y, rect.width, rect.height);
    });

    const stampedDataUrl = await toDataUrl(output);
    if (stampedDataUrl) {
      triggerDownload(stampedDataUrl);
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-0.5">
          {supportedRange.map((range) => (
            <button
              key={range.value}
              onClick={() => setActiveRange(range.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeRange === range.value
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          onClick={downloadScreenshot}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/40 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
        >
          Download PNG
        </button>
      </div>
      <div className="relative rounded-b-2xl overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/60 z-10">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
        <div
          id={chartContainerId}
          ref={chartContainerRef}
          className="w-full touch-none select-none"
          style={{
            height: 480,
            overflow: "hidden",
            touchAction: "none",
            overscrollBehavior: "contain",
          }}
        />
      </div>
    </div>
  );
}
