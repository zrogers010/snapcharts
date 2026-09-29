"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import type { ChartRange } from "@/components/stock-chart/types";

type LightweightChartProps = {
  symbol: string;
  range: ChartRange;
  containerId: string;
};

export default function LightweightChart({
  symbol,
  range,
  containerId,
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadChart = async () => {
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // Dynamically import lightweight-charts
        const { createChart } = await import("lightweight-charts");

        if (!mounted) return;

        // Cleanup previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }

        if (!containerRef.current) {
          setError("Chart container not available");
          setIsLoading(false);
          return;
        }

        // Fetch chart data
        const response = await fetch(
          `/api/chart/${encodeURIComponent(symbol)}?range=${range}`
        );
        
        if (!mounted) return;

        if (!response.ok) {
          throw new Error("Failed to load chart data");
        }

        const payload = await response.json();
        const data = payload.data || [];

        if (!mounted) return;

        if (data.length === 0) {
          setError("No data available");
          setIsLoading(false);
          return;
        }

        if (!containerRef.current) {
          setError("Chart container not available");
          setIsLoading(false);
          return;
        }

        // Create chart
        const chart = createChart(containerRef.current, {
          layout: {
            background: { color: "#09090b" },
            textColor: "#d4d4d8",
          },
          grid: {
            vertLines: { color: "#27272a" },
            horzLines: { color: "#27272a" },
          },
          width: containerRef.current.clientWidth,
          height: 480,
          timeScale: {
            timeVisible: range === "1d" || range === "5d",
            secondsVisible: false,
            borderColor: "#3f3f46",
          },
          rightPriceScale: {
            borderColor: "#3f3f46",
          },
          crosshair: {
            mode: 1,
            vertLine: {
              color: "#52525b",
              width: 1,
              style: 2,
              labelBackgroundColor: "#3b82f6",
            },
            horzLine: {
              color: "#52525b",
              width: 1,
              style: 2,
              labelBackgroundColor: "#3b82f6",
            },
          },
        });

        if (!mounted) {
          chart.remove();
          return;
        }

        chartRef.current = chart;

        // Add candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: "#10b981",
          downColor: "#ef4444",
          borderUpColor: "#10b981",
          borderDownColor: "#ef4444",
          wickUpColor: "#10b981",
          wickDownColor: "#ef4444",
        });

        seriesRef.current = candlestickSeries;

        // Set data
        candlestickSeries.setData(data as CandlestickData<Time>[]);

        // Fit content
        chart.timeScale().fitContent();

        // Handle resize
        const handleResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
            });
          }
        };

        resizeHandlerRef.current = handleResize;
        window.addEventListener("resize", handleResize);

        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Chart load error:", err);
        if (mounted) {
          setError("Failed to load chart");
          setIsLoading(false);
        }
      }
    };

    loadChart();

    return () => {
      mounted = false;
      
      if (resizeHandlerRef.current) {
        window.removeEventListener("resize", resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [symbol, range]);

  return (
    <div className="relative w-full" style={{ height: 480 }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/60 z-10">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090b] text-zinc-400 text-sm">
          {error}
        </div>
      )}
      <div
        id={containerId}
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
}
