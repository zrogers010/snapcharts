import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";

interface RangeConfig {
  periodLabel: string;
  interval: string;
  intraday: boolean;
}

const rangeMap: Record<string, RangeConfig> = {
  "1d": { periodLabel: "1d", interval: "5m", intraday: true },
  "5d": { periodLabel: "5d", interval: "30m", intraday: true },
  "1mo": { periodLabel: "1mo", interval: "1d", intraday: false },
  "3mo": { periodLabel: "3mo", interval: "1d", intraday: false },
  "6mo": { periodLabel: "6mo", interval: "1d", intraday: false },
  "1y": { periodLabel: "1y", interval: "1d", intraday: false },
  "5y": { periodLabel: "5y", interval: "1wk", intraday: false },
};

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "1d":
      // Fetch 6 days back to guarantee we capture the last trading day
      // (covers weekends + holidays), then trim to latest session
      return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    case "5d":
      return new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    case "1mo":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3mo":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6mo":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "5y":
      return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

function filterToLastTradingDay(quotes: any[]): any[] {
  if (quotes.length === 0) return quotes;

  // Group volume by UTC date to find the last real trading session
  const volumeByDay: Record<string, number> = {};
  for (const q of quotes) {
    const day = new Date(q.date).toISOString().split("T")[0];
    volumeByDay[day] = (volumeByDay[day] || 0) + (q.volume || 0);
  }

  // Find the most recent date with actual trading volume
  const tradingDays = Object.entries(volumeByDay)
    .filter(([, vol]) => vol > 0)
    .map(([day]) => day)
    .sort();

  if (tradingDays.length === 0) return quotes;
  const lastTradingDay = tradingDays[tradingDays.length - 1];

  return quotes.filter(
    (q: any) => new Date(q.date).toISOString().split("T")[0] === lastTradingDay
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const range = request.nextUrl.searchParams.get("range") || "1y";
  const symbol = params.symbol.toUpperCase();
  const config = rangeMap[range] || rangeMap["1y"];

  try {
    const result = await yahooFinance.chart(symbol, {
      period1: getStartDate(config.periodLabel),
      interval: config.interval as any,
    });

    let quotes = (result.quotes || []).filter(
      (q: any) =>
        q.open != null && q.close != null && q.high != null && q.low != null
    );

    const isCrypto = symbol.includes("-");
    if (range === "1d" && !isCrypto) {
      quotes = filterToLastTradingDay(quotes);
    }

    const data = quotes.map((q: any) => {
        const date = new Date(q.date);
        return {
          time: config.intraday
            ? Math.floor(date.getTime() / 1000)
            : date.toISOString().split("T")[0],
          open: parseFloat(q.open.toFixed(2)),
          high: parseFloat(q.high.toFixed(2)),
          low: parseFloat(q.low.toFixed(2)),
          close: parseFloat(q.close.toFixed(2)),
          volume: q.volume || 0,
        };
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Chart error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
