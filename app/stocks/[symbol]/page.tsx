import { redirect } from "next/navigation";

type LegacyStocksPageProps = {
  params: { symbol: string };
};

export default function LegacyStocksPage({ params }: LegacyStocksPageProps) {
  let symbol = params.symbol;
  try {
    symbol = decodeURIComponent(params.symbol);
  } catch {
    symbol = params.symbol;
  }
  symbol = symbol.toUpperCase().trim();
  redirect(`/chart/${encodeURIComponent(symbol)}`);
}
