import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Discover | SnapCharts",
  description:
    "Browse symbols by trading setup and discover related ideas across stocks, crypto, and futures.",
  alternates: {
    canonical: "/discover",
  },
  openGraph: {
    title: "Discover | SnapCharts",
    description:
      "Browse symbols by trading setup and discover related ideas across stocks, crypto, and futures.",
    type: "website",
    siteName: "SnapCharts",
    url: "/discover",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover | SnapCharts",
    description:
      "Browse symbols by setup, from AI leaders and breakouts to futures and commodities.",
  },
};

type DiscoverTopic = {
  slug: string;
  label: string;
  description: string;
  symbols: {
    symbol: string;
    name: string;
  }[];
};

const discoverTopics: DiscoverTopic[] = [
  {
    slug: "ai",
    label: "AI",
    description: "AI leaders, semis, and cloud acceleration plays.",
    symbols: [
      { symbol: "NVDA", name: "NVIDIA Corp." },
      { symbol: "MSFT", name: "Microsoft Corp." },
      { symbol: "GOOGL", name: "Alphabet Inc." },
      { symbol: "AMD", name: "Advanced Micro Devices" },
      { symbol: "PLTR", name: "Palantir Technologies" },
    ],
  },
  {
    slug: "breakouts",
    label: "Breakouts",
    description: "Momentum names with sharp directional expansion.",
    symbols: [
      { symbol: "TSLA", name: "Tesla, Inc." },
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "META", name: "Meta Platforms" },
      { symbol: "AMZN", name: "Amazon.com, Inc." },
      { symbol: "MSTR", name: "MicroStrategy, Inc." },
    ],
  },
  {
    slug: "crypto",
    label: "Crypto",
    description: "Crypto and crypto-adjacent tickers, ETFs, and pairs.",
    symbols: [
      { symbol: "BTC-USD", name: "Bitcoin" },
      { symbol: "ETH-USD", name: "Ethereum" },
      { symbol: "SOL-USD", name: "Solana" },
      { symbol: "GBTC", name: "Grayscale Bitcoin Trust" },
      { symbol: "MSTR", name: "MicroStrategy, Inc." },
    ],
  },
  {
    slug: "options",
    label: "Options",
    description: "High-liquidity names commonly used in options strategies.",
    symbols: [
      { symbol: "SPY", name: "SPDR S&P 500 ETF" },
      { symbol: "QQQ", name: "Invesco QQQ Trust" },
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "TSLA", name: "Tesla, Inc." },
      { symbol: "NVDA", name: "NVIDIA Corp." },
    ],
  },
  {
    slug: "futures",
    label: "Futures",
    description: "Top futures symbols for macro and sentiment-driven setups.",
    symbols: [
      { symbol: "ES=F", name: "E-mini S&P 500" },
      { symbol: "NQ=F", name: "E-mini Nasdaq-100" },
      { symbol: "CL=F", name: "Crude Oil" },
      { symbol: "GC=F", name: "Gold" },
      { symbol: "ZN=F", name: "10-Year Treasury Note" },
    ],
  },
  {
    slug: "commodities",
    label: "Commodities",
    description: "Energy, metals, and industrial materials.",
    symbols: [
      { symbol: "CL=F", name: "Crude Oil" },
      { symbol: "GC=F", name: "Gold" },
      { symbol: "SI=F", name: "Silver" },
      { symbol: "NG=F", name: "Natural Gas" },
      { symbol: "HG=F", name: "Copper" },
    ],
  },
  {
    slug: "earnings",
    label: "Earnings",
    description: "Current movers with strong earnings narratives.",
    symbols: [
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "MSFT", name: "Microsoft Corp." },
      { symbol: "GOOGL", name: "Alphabet Inc." },
      { symbol: "META", name: "Meta Platforms" },
      { symbol: "AMZN", name: "Amazon.com, Inc." },
    ],
  },
  {
    slug: "mean-reversion",
    label: "Mean Reversion",
    description: "Potential pullback/retrace candidates and structure reclaim ideas.",
    symbols: [
      { symbol: "NVDA", name: "NVIDIA Corp." },
      { symbol: "PLTR", name: "Palantir Technologies" },
      { symbol: "SOFI", name: "SoFi Technologies" },
      { symbol: "MSTR", name: "MicroStrategy, Inc." },
      { symbol: "RIOT", name: "Riot Platforms" },
    ],
  },
  {
    slug: "swing",
    label: "Swing",
    description: "Ideas with multi-day structure and trend continuation potential.",
    symbols: [
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "MSFT", name: "Microsoft Corp." },
      { symbol: "TSLA", name: "Tesla, Inc." },
      { symbol: "AMD", name: "Advanced Micro Devices" },
      { symbol: "JPM", name: "JPMorgan Chase & Co." },
    ],
  },
];

type SearchParams = {
  topic?: string | string[];
};

export default function DiscoverPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const selectedTopic = Array.isArray(searchParams?.topic)
    ? searchParams.topic[0]
    : searchParams?.topic || "";
  const selectedTopicSlug = selectedTopic.toLowerCase();
  const activeTopic = discoverTopics.find((topic) => topic.slug === selectedTopicSlug);

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-white">Discover</h1>
      <p className="text-sm text-zinc-400 mt-2">
        Pick a setup theme to open the related symbol list.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {discoverTopics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/discover?topic=${topic.slug}`}
            className={`px-3 py-2 rounded-full text-xs border ${
              activeTopic?.slug === topic.slug
                ? "bg-blue-500/20 text-blue-300 border-blue-400/60"
                : "bg-zinc-900 border-zinc-700 text-zinc-200"
            }`}
          >
            {topic.label}
          </Link>
        ))}
      </div>

      <section className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        {activeTopic ? (
          <>
            <h2 className="text-lg font-semibold text-white">{activeTopic.label}</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {activeTopic.description}
            </p>
            <div className="mt-4 space-y-2">
              {activeTopic.symbols.map((item) => (
                <Link
                  key={item.symbol}
                  href={`/stock/${item.symbol}`}
                  className="flex items-center justify-between border border-zinc-800 rounded-xl p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-sm text-zinc-200">{item.name}</span>
                  <span className="text-xs text-blue-300">{item.symbol}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white">Choose a topic</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Select a button above to view symbols and open them from the list.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
