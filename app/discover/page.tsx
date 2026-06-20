import type { Metadata } from "next";
import Link from "next/link";
import {
  getMarketQuotes,
  type MarketQuote,
  type QuoteSeed,
} from "@/lib/marketData";

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

const defaultMoverSeeds: QuoteSeed[] = [
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "MSTR", name: "MicroStrategy, Inc." },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "ES=F", name: "E-mini S&P 500" },
  { symbol: "NQ=F", name: "E-mini Nasdaq-100" },
  { symbol: "CL=F", name: "Crude Oil" },
];

type SearchParams = {
  topic?: string | string[];
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedTopic = Array.isArray(resolvedSearchParams?.topic)
    ? resolvedSearchParams.topic[0]
    : resolvedSearchParams?.topic || "";
  const selectedTopicSlug = selectedTopic.toLowerCase();
  const activeTopic = discoverTopics.find((topic) => topic.slug === selectedTopicSlug);
  const [activeQuotes, movers] = await Promise.all([
    activeTopic ? getMarketQuotes(activeTopic.symbols) : Promise.resolve([]),
    getMarketQuotes(defaultMoverSeeds),
  ]);
  const topMovers = movers
    .slice()
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 4);

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

      <section className="mt-8">
        <SectionHeading
          title="Live movers"
          description="Largest moves across active SnapCharts watch symbols"
        />
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {topMovers.map((quote) => (
            <QuoteCard key={quote.symbol} quote={quote} compact />
          ))}
        </div>
      </section>

      <section className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        {activeTopic ? (
          <>
            <h2 className="text-lg font-semibold text-white">{activeTopic.label}</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {activeTopic.description}
            </p>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeQuotes.map((quote) => (
                <QuoteCard key={quote.symbol} quote={quote} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white">Choose a topic</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Select a button above to view live quote cards for that setup.
            </p>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {discoverTopics.slice(0, 6).map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/discover?topic=${topic.slug}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-800/60 transition-colors"
                >
                  <span className="text-sm font-semibold text-zinc-100">
                    {topic.label}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {topic.symbols.map((item) => item.symbol).join(" / ")}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="text-sm text-zinc-500">{description}</p>
    </div>
  );
}

function QuoteCard({
  quote,
  compact = false,
}: {
  quote: MarketQuote;
  compact?: boolean;
}) {
  const up = quote.changePercent >= 0;
  return (
    <Link
      href={`/chart/${encodeURIComponent(quote.symbol)}`}
      className={`block rounded-xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800/60 transition-colors ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{quote.symbol}</p>
          <p className="mt-0.5 text-xs text-zinc-500 truncate">{quote.name}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            up
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300"
              : "border-red-300/30 bg-red-300/10 text-red-300"
          }`}
        >
          {up ? "+" : ""}
          {quote.changePercent.toFixed(2)}%
        </span>
      </div>
      <p className="mt-3 text-lg font-bold text-zinc-100 tabular-nums">
        {quote.price}
      </p>
    </Link>
  );
}
