import { Metadata } from "next";
import Link from "next/link";
import SharedChartDisplay from "@/components/SharedChartDisplay";
import StockView from "@/app/stock/[symbol]/StockView";
import { getShare } from "@/lib/chartShareStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChartPageProps = {
  params: { symbol: string };
};

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeRouteSymbol = (value: string) =>
  safeDecode(value).toUpperCase().trim().split(":").pop() || "";

export async function generateMetadata({
  params,
}: ChartPageProps): Promise<Metadata> {
  const routeValue = safeDecode(params.symbol).trim();
  const share = getShare(routeValue);
  if (share) {
    return {
      title: `${share.symbol} - ${share.range.toUpperCase()} Snapshot | SnapCharts`,
      description: `Shareable chart snapshot for ${share.symbol} (${share.range.toUpperCase()}).`,
      openGraph: {
        title: `${share.symbol} Snapshot`,
        description: `Shareable chart snapshot for ${share.symbol}.`,
        type: "website",
        url: `/chart/${encodeURIComponent(routeValue)}`,
        siteName: "SnapCharts",
      },
    };
  }

  const symbol = normalizeRouteSymbol(routeValue);
  const encodedSymbol = encodeURIComponent(symbol);
  const pageTitle = `${symbol} Price & Chart | SnapCharts`;

  return {
    title: pageTitle,
    description: `View real-time price, interactive charts, key statistics, and latest news for ${symbol}.`,
    alternates: {
      canonical: `/chart/${encodedSymbol}`,
    },
    openGraph: {
      title: pageTitle,
      description: `View real-time chart and market data for ${symbol}.`,
      type: "article",
      url: `/chart/${encodedSymbol}`,
      siteName: "SnapCharts",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: `Market overview, interactive chart, and latest headlines for ${symbol}.`,
    },
  };
}

export default function ChartSymbolPage({ params }: ChartPageProps) {
  const routeValue = safeDecode(params.symbol).trim();
  const share = getShare(routeValue);
  if (share) {
    const createdAt = new Date(share.createdAt).toLocaleString();
    const imageSrc = `/api/charts/share/${share.id}/image`;
    return (
      <main className="min-h-screen bg-[#09090b] text-zinc-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to SnapCharts
          </Link>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-6">
            <p className="text-zinc-400 text-sm">Shareable chart snapshot</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold">
              {share.symbol} ({share.range.toUpperCase()})
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Created {createdAt}</p>
            <SharedChartDisplay
              symbol={share.symbol}
              range={share.range}
              imageSrc={imageSrc}
            />
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-1">Share URL</p>
              <p className="text-sm text-zinc-300 break-all">
                /chart/{share.id}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const normalizedSymbol = normalizeRouteSymbol(routeValue);
  return <StockView symbol={normalizedSymbol} />;
}
