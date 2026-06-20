import { redirect } from "next/navigation";

type LegacyStocksPageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function LegacyStocksPage({ params }: LegacyStocksPageProps) {
  const { symbol: routeSymbol } = await params;
  let symbol = routeSymbol;
  try {
    symbol = decodeURIComponent(routeSymbol);
  } catch {
    symbol = routeSymbol;
  }
  symbol = symbol.toUpperCase().trim();
  redirect(`/chart/${encodeURIComponent(symbol)}`);
}
