"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTimeframe,
  cleanSymbol,
  rangeToResolution,
  timeRanges,
} from "@/components/stock-chart/config";
import { createDatafeed } from "@/components/stock-chart/datafeed";
import {
  buildShareUrl,
  captureChartImage as captureChartImageFromWidget,
  triggerDownload as triggerDownloadFile,
} from "@/components/stock-chart/screenshot";
import { loadTradingViewScript } from "@/components/stock-chart/tradingview";
import type {
  ChartRange,
  TradingViewWidget,
  TradingViewWindow,
} from "@/components/stock-chart/types";

export default function StockChart({ symbol }: { symbol: string }) {
  const tickerSymbol = useMemo(() => cleanSymbol(symbol), [symbol]);
  const [activeRange, setActiveRange] = useState<ChartRange>("1y");
  const chartContainerId = useMemo(
    () =>
      `tv-chart-container-${tickerSymbol
        .concat("-", activeRange)
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .toLowerCase()}`,
    [tickerSymbol, activeRange]
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TradingViewWidget | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isShareSaving, setIsShareSaving] = useState(false);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const [copyLinkFailed, setCopyLinkFailed] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const isRemovingRef = useRef(false);
  const isChartReadyRef = useRef(false);
  const buildIdRef = useRef(0);
  const actionMenuRef = useRef<HTMLDivElement>(null);

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
        timeframe: buildTimeframe(activeRange),
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
        const applyVisibleRange = () => {
          const { from, to } = buildTimeframe(activeRange);
          const chartApi =
            (widget.activeChart?.() as { setVisibleRange?: (range: { from: number; to: number }) => void } | undefined) ??
            (widget.chart?.() as { setVisibleRange?: (range: { from: number; to: number }) => void } | undefined) ??
            (widget.chart?.(0) as { setVisibleRange?: (range: { from: number; to: number }) => void } | undefined);
          chartApi?.setVisibleRange?.({ from, to });
        };
        window.requestAnimationFrame(() => applyVisibleRange());
        isChartReadyRef.current = true;
        setIsLoading(false);
      });
    } catch {
      // Script load or widget boot can fail transiently; leave the loading state clean.
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

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

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

  const triggerDownload = (url: string) => {
    triggerDownloadFile(url, tickerSymbol, activeRange);
  };

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(""), 1500);
  };

  const captureChartImage = async (): Promise<string | undefined> => {
    return captureChartImageFromWidget({
      widgetRef,
      chartContainerRef,
      isChartReadyRef,
    });
  };

  const handleDownloadPng = async () => {
    setIsActionMenuOpen(false);
    const data = await captureChartImage();
    if (!data) {
      showActionMessage("Could not capture chart image");
      return;
    }
    triggerDownload(data);
    setDownloadDone(true);
    showActionMessage("✓ PNG download started");
    window.setTimeout(() => setDownloadDone(false), 1500);
  };

  const copyShareUrl = async (shareUrl: string): Promise<boolean> => {
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        // Clipboard access can be denied by browser permissions; fall back to prompt.
      }
    }

    if (!copied) {
      const fallback = window.prompt("Copy this link", shareUrl);
      copied = fallback !== null;
    }
    return copied;
  };

  const handleShareLink = async () => {
    setIsActionMenuOpen(false);
    setCopyLinkDone(false);
    setCopyLinkFailed(false);
    setIsShareSaving(true);
    try {
      const data = await captureChartImage();
      if (!data) {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not create chart link image");
        return;
      }

      const response = await fetch("/api/charts/share", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          symbol: tickerSymbol,
          range: activeRange,
          imageData: data,
        }),
      });

      if (!response.ok) {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not create chart link");
        return;
      }

      const payload = (await response.json()) as { id?: string; url?: string };
      if (!payload?.id) {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not create chart link");
        return;
      }

      const shareUrl = buildShareUrl(payload.id);
      const copied = await copyShareUrl(shareUrl);
      if (copied) {
        setCopyLinkDone(true);
        showActionMessage("✓ Chart link copied");
        window.setTimeout(() => setCopyLinkDone(false), 1500);
      } else {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not copy chart link");
      }
      return;

    } finally {
      setIsShareSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-0.5">
          {timeRanges.map((range) => (
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
        <div className="relative" ref={actionMenuRef}>
          <button
            onClick={() => setIsActionMenuOpen((v) => !v)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:text-white border border-blue-500/30 transition-colors shadow-sm"
            aria-expanded={isActionMenuOpen}
            aria-haspopup="menu"
          >
            Export
            <span className="ml-2 text-xs text-blue-200/80">▾</span>
          </button>
          {isActionMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden z-20">
              <button
                onClick={handleShareLink}
                disabled={isShareSaving}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isShareSaving
                  ? "Creating chart link..."
                  : copyLinkFailed
                    ? "Unable to copy link"
                    : copyLinkDone
                    ? "✓ Chart link copied"
                    : "Copy chart link"}
              </button>
              <button
                onClick={handleDownloadPng}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800 border-t border-zinc-800"
              >
                {downloadDone ? "✓ Download started" : "Download PNG"}
              </button>
            </div>
          )}
          {(copyLinkDone || copyLinkFailed || downloadDone || actionMessage) && (
            <div className="absolute right-0 top-full mt-2 px-2 py-1 rounded-md border border-emerald-500/40 bg-zinc-900/95 text-[11px] leading-tight text-emerald-200 shadow-lg z-40 whitespace-nowrap">
              {actionMessage ||
                (copyLinkDone
                  ? "✓ Link copied"
                  : copyLinkFailed
                  ? "Could not create chart link"
                  : "✓ PNG download started")}
            </div>
          )}
        </div>
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
