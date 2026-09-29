"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  buildTimeframe,
  cleanSymbol,
  getSymbolKind,
  toTradingViewSymbol,
  rangeToResolution,
  timeRanges,
} from "@/components/stock-chart/config";
import { createDatafeed } from "@/components/stock-chart/datafeed";
import {
  buildShareUrl,
  captureChartImage as captureChartImageFromWidget,
  captureLightweightChartImage,
  triggerDownload as triggerDownloadFile,
} from "@/components/stock-chart/screenshot";
import { loadTradingViewScript } from "@/components/stock-chart/tradingview";
import type {
  ChartRange,
  TradingViewWidget,
  TradingViewWindow,
} from "@/components/stock-chart/types";
import {
  trackSnapCreated,
  trackSnapShareClick,
} from "@/lib/analytics";
import { createBrandedCard } from "@/components/stock-chart/branded-card";

const LightweightChart = dynamic(
  () => import("@/components/stock-chart/LightweightChart"),
  { ssr: false }
);

export default function StockChart({ symbol }: { symbol: string }) {
  const tickerSymbol = useMemo(() => cleanSymbol(symbol), [symbol]);
  const symbolKind = useMemo(() => getSymbolKind(tickerSymbol), [tickerSymbol]);
  const tvSymbol = useMemo(() => toTradingViewSymbol(tickerSymbol), [tickerSymbol]);
  const useLightweight = symbolKind === "future";
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
  const [shareSuccessData, setShareSuccessData] = useState<{
    shareUrl: string;
    imageData: string;
  } | null>(null);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const [copyLinkFailed, setCopyLinkFailed] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [canShare, setCanShare] = useState(false);
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
        symbol: tvSymbol,
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
        datafeed: createDatafeed(tickerSymbol, tvSymbol, activeRange),
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
    if (useLightweight) {
      setIsLoading(false);
      return;
    }

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
  }, [tickerSymbol, activeRange, useLightweight]);

  useEffect(() => {
    if (useLightweight) return;
    
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
  }, [tickerSymbol, activeRange, useLightweight]);

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

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
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
    if (useLightweight) {
      return captureLightweightChartImage(chartContainerRef);
    }
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
    trackSnapShareClick("download");
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

  const handleSnapCreate = async () => {
    setIsActionMenuOpen(false);
    setCopyLinkDone(false);
    setCopyLinkFailed(false);
    setShareSuccessData(null);
    setIsShareSaving(true);
    
    try {
      let imageData: string | undefined;

      imageData = await captureChartImage();

      if (!imageData) {
        try {
          const [quoteResponse, chartResponse] = await Promise.all([
            fetch(`/api/quote/${encodeURIComponent(tickerSymbol)}`),
            fetch(`/api/chart/${encodeURIComponent(tickerSymbol)}?range=${activeRange}`),
          ]);

          if (quoteResponse.ok && chartResponse.ok) {
            const quotePayload = await quoteResponse.json();
            const chartPayload = await chartResponse.json();
            
            if (quotePayload?.quote && chartPayload?.data) {
              imageData = await createBrandedCard({
                symbol: tickerSymbol,
                range: activeRange,
                quoteData: quotePayload.quote,
                chartData: chartPayload.data,
              });
            }
          }
        } catch (error) {
          console.warn("Branded card fallback failed:", error);
        }
      }

      if (!imageData) {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not create snap image");
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
          imageData,
        }),
      });

      if (!response.ok) {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not create snap");
        return;
      }

      const payload = (await response.json()) as { id?: string; url?: string };
      if (!payload?.id) {
        setCopyLinkFailed(true);
        window.setTimeout(() => setCopyLinkFailed(false), 1500);
        showActionMessage("Could not create snap");
        return;
      }

      const shareUrl = buildShareUrl(payload.id);
      trackSnapCreated(tickerSymbol, activeRange);
      
      setShareSuccessData({ shareUrl, imageData });
      setIsActionMenuOpen(true);
      showActionMessage("✓ Snap created");
    } finally {
      setIsShareSaving(false);
    }
  };

  const handleCopyLinkFromSuccess = async () => {
    if (!shareSuccessData) return;
    
    const copied = await copyShareUrl(shareSuccessData.shareUrl);
    if (copied) {
      trackSnapShareClick("copy");
      setCopyLinkDone(true);
      showActionMessage("✓ Link copied");
      window.setTimeout(() => setCopyLinkDone(false), 1500);
    } else {
      setCopyLinkFailed(true);
      window.setTimeout(() => setCopyLinkFailed(false), 1500);
      showActionMessage("Could not copy link");
    }
  };

  const handleNativeShare = async () => {
    if (!shareSuccessData) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tickerSymbol} Chart`,
          text: `Check out this ${tickerSymbol} chart on SnapCharts`,
          url: shareSuccessData.shareUrl,
        });
        trackSnapShareClick("native");
        showActionMessage("✓ Shared");
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          showActionMessage("Could not share");
        }
      }
    }
  };

  const handleDownloadFromSuccess = () => {
    if (!shareSuccessData) return;
    
    triggerDownload(shareSuccessData.imageData);
    trackSnapShareClick("download");
    setDownloadDone(true);
    showActionMessage("✓ PNG download started");
    window.setTimeout(() => setDownloadDone(false), 1500);
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
            onClick={shareSuccessData ? () => setIsActionMenuOpen((v) => !v) : handleSnapCreate}
            disabled={isShareSaving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              shareSuccessData
                ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30"
                : "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border border-blue-500/30"
            } transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-expanded={isActionMenuOpen}
            aria-haspopup="menu"
          >
            {isShareSaving ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 border border-blue-200/40 border-t-blue-200 rounded-full animate-spin" />
                Creating...
              </span>
            ) : shareSuccessData ? (
              <span className="inline-flex items-center gap-1.5">
                ✓ Snap created
                <span className="ml-1 text-xs">▾</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                📸 Snap
              </span>
            )}
          </button>
          {isActionMenuOpen && shareSuccessData && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden z-20">
              <button
                onClick={handleCopyLinkFromSuccess}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800"
              >
                {copyLinkDone ? "✓ Link copied" : "Copy share link"}
              </button>
              {canShare && (
                <button
                  onClick={handleNativeShare}
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800 border-t border-zinc-800"
                >
                  Share...
                </button>
              )}
              <button
                onClick={handleDownloadFromSuccess}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800 border-t border-zinc-800"
              >
                {downloadDone ? "✓ Download started" : "Download PNG"}
              </button>
            </div>
          )}
          {!shareSuccessData && isActionMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden z-20">
              <button
                onClick={handleSnapCreate}
                disabled={isShareSaving}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isShareSaving
                  ? "Creating snap..."
                  : copyLinkFailed
                    ? "Unable to create snap"
                    : "Create snap"}
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
                  ? "Could not create snap"
                  : "✓ PNG download started")}
            </div>
          )}
        </div>
      </div>
      <div className="relative rounded-b-2xl overflow-hidden">
        {useLightweight ? (
          <div ref={chartContainerRef}>
            <LightweightChart
              symbol={tickerSymbol}
              range={activeRange}
              containerId={chartContainerId}
            />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
