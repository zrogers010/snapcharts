import { Metadata } from "next";
import StockView from "./StockView";

export async function generateMetadata({
  params,
}: {
  params: { symbol: string };
}): Promise<Metadata> {
  const symbol = params.symbol.toUpperCase();
  return {
    title: `${symbol} Price & Chart — ProStockCharts`,
    description: `View real-time price, interactive charts, key statistics, and latest news for ${symbol}.`,
  };
}

export default function StockPage({
  params,
}: {
  params: { symbol: string };
}) {
  return <StockView symbol={params.symbol.toUpperCase()} />;
}
