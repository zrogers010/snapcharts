import { Metadata } from "next";
import StockView from "./StockView";

export async function generateMetadata({
  params,
}: {
  params: { symbol: string };
}): Promise<Metadata> {
  const symbol = params.symbol.toUpperCase().trim().split(":").pop() || "";
  const pageTitle = `${symbol} Price & Chart | SnapCharts`;

  return {
    title: pageTitle,
    description: `View real-time price, interactive charts, key statistics, and latest news for ${symbol}.`,
    alternates: {
      canonical: `/stock/${symbol}`,
    },
    openGraph: {
      title: pageTitle,
      description: `View real-time chart and market data for ${symbol}.`,
      type: "article",
      url: `/stock/${symbol}`,
      siteName: "SnapCharts",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: `Market overview, interactive chart, and latest headlines for ${symbol}.`,
    },
  };
}

export default function StockPage({
  params,
}: {
  params: { symbol: string };
}) {
  const normalizedSymbol =
    params.symbol.toUpperCase().trim().split(":").pop() || "";
  return <StockView symbol={normalizedSymbol} />;
}
