import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();
    const quote = await yahooFinance.quote(symbol);

    const quoteType = (quote as any)?.quoteType || "EQUITY";
    const isCrypto = quoteType === "CRYPTOCURRENCY";
    const isFuture = quoteType === "FUTURE" || quoteType === "COMMODITY";

    let modules: string[];
    if (isCrypto || isFuture) {
      modules = ["summaryDetail"];
    } else {
      modules = [
        "assetProfile",
        "summaryDetail",
        "financialData",
        "defaultKeyStatistics",
        "recommendationTrend",
      ];
    }

    const summary = await yahooFinance
      .quoteSummary(symbol, { modules: modules as any })
      .catch(() => null);

    return NextResponse.json({ quote, summary });
  } catch (error) {
    console.error("Quote error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote data" },
      { status: 500 }
    );
  }
}
