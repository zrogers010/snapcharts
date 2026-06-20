import { redirect } from "next/navigation";

type LegacyStockPageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function LegacyStockPage({ params }: LegacyStockPageProps) {
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
