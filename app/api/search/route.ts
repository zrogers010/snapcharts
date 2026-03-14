import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  try {
    const result = await yahooFinance.search(q, {
      quotesCount: 8,
      newsCount: 0,
    });

    const allowedTypes = new Set([
      "EQUITY",
      "ETF",
      "INDEX",
      "CRYPTOCURRENCY",
      "FUTURE",
      "COMMODITY",
    ]);

    const results = (result.quotes || [])
      .filter(
        (item: any) => item.symbol && allowedTypes.has(item.quoteType)
      )
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        type: item.quoteType,
        exchange: item.exchDisp || item.exchange || "",
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
