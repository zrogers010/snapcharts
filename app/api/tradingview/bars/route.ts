import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";

interface BarRow {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function normalizeTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp)) return 0;
  return Math.abs(timestamp) > 2e11 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
}

function clampDate(timestamp: number, fallbackSeconds: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return new Date(fallbackSeconds * 1000);
  }
  return new Date(timestamp * 1000);
}

function resolutionToInterval(resolution: string): string {
  switch (resolution) {
    case "1":
      return "1m";
    case "5":
      return "5m";
    case "15":
      return "15m";
    case "30":
      return "30m";
    case "60":
      return "60m";
    case "1W":
    case "1w":
      return "1wk";
    case "1M":
      return "1mo";
    case "1D":
    default:
      return "1d";
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const symbol = (params.get("symbol") || "").toUpperCase().trim();
  const resolution = (params.get("resolution") || "1D").trim();
  const range = (params.get("range") || "").trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const fallbackFrom = now - 60 * 60 * 24 * 365;
  const rangeWindowSeconds: Record<string, number> = {
    "1d": 1 * 24 * 60 * 60,
    "5d": 5 * 24 * 60 * 60,
    "1mo": 31 * 24 * 60 * 60,
    "3mo": 92 * 24 * 60 * 60,
    "6mo": 183 * 24 * 60 * 60,
    "1y": 366 * 24 * 60 * 60,
    "5y": 5 * 366 * 24 * 60 * 60,
  };

  const rawFrom = normalizeTimestamp(Number(params.get("from") || fallbackFrom));
  const rawTo = normalizeTimestamp(Number(params.get("to") || now));
  const forcedToByRange = rangeWindowSeconds[range] ? now : undefined;
  const to =
    forcedToByRange != null
      ? forcedToByRange
      : rawTo > 0 && rawTo <= now
      ? rawTo
      : now;
  const forcedFromByRange = rangeWindowSeconds[range]
    ? now - rangeWindowSeconds[range]
    : undefined;
  const fromCandidate =
    forcedFromByRange != null ? forcedFromByRange : rawFrom > 0 ? rawFrom : fallbackFrom;
  const from = Math.max(1, Math.min(fromCandidate, to - 60));

  if (!symbol) {
    return NextResponse.json({ bars: [] }, { status: 400 });
  }

  const interval = resolutionToInterval(resolution);

  try {
    const result = await yahooFinance.chart(symbol, {
      period1: clampDate(Math.min(from, to), fallbackFrom),
      period2: clampDate(to + 60 * 60 * 24, now),
      interval: interval as any,
    });

    const bars: BarRow[] = (result.quotes || [])
      .filter(
        (q: any) =>
          q.open != null &&
          q.close != null &&
          q.high != null &&
          q.low != null &&
          Number.isFinite(new Date(q.date).getTime())
      )
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: parseFloat(q.open.toFixed(2)),
        high: parseFloat(q.high.toFixed(2)),
        low: parseFloat(q.low.toFixed(2)),
        close: parseFloat(q.close.toFixed(2)),
        volume: q.volume || 0,
      }))
      .filter((bar) => bar.time >= from && bar.time <= to)
      .sort((a, b) => a.time - b.time);

    return NextResponse.json({ bars });
  } catch (error) {
    console.error("TradingView bars error:", error);
    return NextResponse.json({ bars: [] }, { status: 500 });
  }
}
