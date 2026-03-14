import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yahoo";

export async function GET(
  _request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();
    const result = await yahooFinance.search(symbol, {
      quotesCount: 0,
      newsCount: 20,
    });

    const news = (result.news || []).map((article: any) => ({
      title: article.title,
      link: article.link,
      publisher: article.publisher,
      publishedAt: article.providerPublishTime
        ? new Date(
            typeof article.providerPublishTime === "number"
              ? article.providerPublishTime * 1000
              : article.providerPublishTime
          ).toISOString()
        : null,
      thumbnail:
        article.thumbnail?.resolutions?.[0]?.url || null,
    }));

    return NextResponse.json({ news });
  } catch (error) {
    console.error("News error:", error);
    return NextResponse.json({ news: [] });
  }
}
