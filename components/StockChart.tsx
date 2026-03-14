"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";

interface ChartDataPoint {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const timeRanges = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
];

type ChartType = "area" | "candle";

export default function StockChart({ symbol }: { symbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeRange, setActiveRange] = useState("1y");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chart/${symbol}?range=${activeRange}`);
        const json = await res.json();
        if (!cancelled) setChartData(json.data || []);
      } catch {
        if (!cancelled) setChartData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [symbol, activeRange]);

  // Render chart
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 480,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#52525b",
        fontSize: 11,
        fontFamily: "Inter, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#27272a25" },
        horzLines: { color: "#27272a25" },
      },
      crosshair: {
        vertLine: {
          color: "#71717a60",
          width: 1,
          style: 3,
          labelBackgroundColor: "#27272a",
        },
        horzLine: {
          color: "#71717a60",
          width: 1,
          style: 3,
          labelBackgroundColor: "#27272a",
        },
      },
      rightPriceScale: {
        borderColor: "#27272a50",
        scaleMargins: { top: 0.06, bottom: 0.18 },
      },
      timeScale: {
        borderColor: "#27272a50",
        timeVisible: activeRange === "1d" || activeRange === "5d",
        rightOffset: 5,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    // Determine direction for color
    const isPositive =
      chartData.length > 1 &&
      chartData[chartData.length - 1].close >= chartData[0].open;
    const lineColor = isPositive ? "#22c55e" : "#ef4444";

    if (chartType === "area") {
      const series = chart.addAreaSeries({
        lineColor,
        topColor: `${lineColor}18`,
        bottomColor: `${lineColor}02`,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: lineColor,
        crosshairMarkerBackgroundColor: "#fff",
        priceLineVisible: false,
      });
      series.setData(
        chartData.map((d) => ({
          time: d.time as any,
          value: d.close,
        }))
      );
    } else {
      const series = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
        wickDownColor: "#ef444480",
        wickUpColor: "#22c55e80",
      });
      series.setData(
        chartData.map((d) => ({
          time: d.time as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    }

    // Volume bars
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(
      chartData.map((d) => ({
        time: d.time as any,
        value: d.volume,
        color: d.close >= d.open ? "#22c55e15" : "#ef444415",
      }))
    );

    chart.timeScale().fitContent();

    // Double-click to reset zoom
    container.addEventListener("dblclick", () => {
      chart.timeScale().fitContent();
    });

    // Resize
    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [chartData, chartType, activeRange]);

  const download = useCallback(
    (format: "csv" | "json") => {
      if (chartData.length === 0) return;

      const formatTime = (t: string | number) =>
        typeof t === "number" ? new Date(t * 1000).toISOString() : t;

      let blob: Blob;
      let ext: string;

      if (format === "csv") {
        const header = "Date,Open,High,Low,Close,Volume";
        const rows = chartData.map(
          (d) =>
            `${formatTime(d.time)},${d.open},${d.high},${d.low},${d.close},${d.volume}`
        );
        blob = new Blob([header + "\n" + rows.join("\n")], {
          type: "text/csv",
        });
        ext = "csv";
      } else {
        const data = chartData.map((d) => ({
          date: formatTime(d.time),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));
        blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        ext = "json";
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${symbol}_${activeRange}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [chartData, symbol, activeRange]
  );

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl overflow-hidden">
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
        <div className="flex items-center gap-0.5 bg-zinc-800/30 rounded-lg p-0.5">
          <button
            onClick={() => setChartType("area")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              chartType === "area"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("candle")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              chartType === "candle"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Candle
          </button>
        </div>
      </div>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/60 z-10">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" style={{ height: 480 }} />
      </div>
      {chartData.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-800/30">
          <span className="text-[11px] text-zinc-600">Export</span>
          <button
            onClick={() => download("csv")}
            className="text-[11px] text-zinc-500 hover:text-blue-400 transition-colors"
          >
            CSV
          </button>
          <span className="text-zinc-800">·</span>
          <button
            onClick={() => download("json")}
            className="text-[11px] text-zinc-500 hover:text-blue-400 transition-colors"
          >
            JSON
          </button>
        </div>
      )}
    </div>
  );
}
