import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import Link from "next/link";
import Image from "next/image";
import yahooFinance from "@/lib/yahoo";
import { timeAgo } from "@/lib/format";
import type { Metadata } from "next";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "SnapCharts | Real-Time Market Charts, Stock News, and Trading Ideas",
  description:
    "Explore real-time market data with SnapCharts: discover trending stocks, crypto, and futures, read market headlines with images, and share chart analysis ideas.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "stock charts",
    "crypto charts",
    "futures",
    "market news",
    "trading ideas",
    "SnapCharts",
    "stock market",
    "financial dashboard",
  ],
  openGraph: {
    title: "SnapCharts | Real-Time Market Charts and News",
    description:
      "Search symbols, review market movers, and get trading-ready insights in one place.",
    type: "website",
    siteName: "SnapCharts",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapCharts | Real-Time Market Charts and News",
    description:
      "Explore market pulses, trading ideas, and latest headlines for stocks, crypto, and futures.",
  },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snap-charts.com";

type TickerStat = {
  symbol: string;
  name: string;
  price?: string;
  change: number;
};

type PulseGroup = {
  title: string;
  items: TickerStat[];
  color: string;
};

type News = {
  publisher: string;
  title: string;
  link: string;
  publishedAt: string | null;
  image?: string;
};

const marketPulse: PulseGroup[] = [
  {
    title: "Stocks",
    color: "from-blue-500/20 to-blue-500/5",
    items: [
      { symbol: "AAPL", name: "Apple", price: "$233.12", change: 1.8 },
      { symbol: "MSFT", name: "Microsoft", price: "$421.06", change: 2.4 },
      { symbol: "NVDA", name: "NVIDIA", price: "$950.44", change: -0.9 },
      { symbol: "TSLA", name: "Tesla", price: "$165.31", change: 0.7 },
    ],
  },
  {
    title: "Crypto",
    color: "from-amber-500/20 to-amber-500/5",
    items: [
      { symbol: "BTC-USD", name: "Bitcoin", price: "$68,420", change: 3.2 },
      { symbol: "ETH-USD", name: "Ethereum", price: "$3,742", change: 2.1 },
      { symbol: "SOL-USD", name: "Solana", price: "$154.03", change: -1.4 },
      { symbol: "AVAX-USD", name: "Avalanche", price: "$32.88", change: 1.1 },
    ],
  },
  {
    title: "Futures",
    color: "from-emerald-500/20 to-emerald-500/5",
    items: [
      { symbol: "ES=F", name: "S&P 500", price: "5602", change: 0.6 },
      { symbol: "NQ=F", name: "Nasdaq", price: "19020", change: 1.3 },
      { symbol: "CL=F", name: "Crude Oil", price: "$73.41", change: -0.8 },
      { symbol: "GC=F", name: "Gold", price: "$2,352", change: 0.5 },
    ],
  },
];

const watchlists = [
  {
    title: "AI Leaders",
    symbols: ["NVDA", "MSFT", "GOOGL", "AMD", "PLTR"],
  },
  {
    title: "Macro Watch",
    symbols: ["ES=F", "NQ=F", "GC=F", "ZN=F", "CL=F"],
  },
  {
    title: "High Beta",
    symbols: ["TSLA", "SOFI", "MARA", "RIOT", "NVDA"],
  },
];

const newsWatchlistSymbols = [
  "AAPL",
  "MSFT",
  "NVDA",
  "BTC-USD",
  "ES=F",
  "SPY",
];

const newsImageFallback =
  "https://placehold.co/160x160/0f172a/94a3b8?text=SnapCharts";

type MarketNewsCache = {
  updatedAt: number;
  items: News[];
};

const marketNewsCache: MarketNewsCache = {
  updatedAt: 0,
  items: [],
};

const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchSymbolNews(symbol: string): Promise<News[]> {
  try {
    const result = await yahooFinance.search(symbol, {
      quotesCount: 0,
      newsCount: 5,
    });

    if (!Array.isArray(result?.news)) return [];

    return result.news
      .filter((article: any) => Boolean(article.link && article.title))
      .map((article: any) => ({
        title: article.title,
        link: article.link,
        publisher: article.publisher || "Market News",
        publishedAt: article.providerPublishTime
          ? new Date(
              typeof article.providerPublishTime === "number"
                ? article.providerPublishTime * 1000
                : article.providerPublishTime
            ).toISOString()
          : null,
        image:
          article.thumbnail?.resolutions?.[0]?.url ||
          article.thumbnail?.resolutions?.[1]?.url ||
          article.thumbnail ||
          newsImageFallback,
      }));
  } catch {
    return [];
  }
}

async function getLatestMarketNews(): Promise<News[]> {
  const now = Date.now();
  if (
    marketNewsCache.items.length > 0 &&
    now - marketNewsCache.updatedAt < NEWS_CACHE_TTL_MS
  ) {
    return marketNewsCache.items;
  }

  const allNews = await Promise.all(
    newsWatchlistSymbols.map((symbol) => fetchSymbolNews(symbol))
  );

  const uniqueLinks = new Set<string>();
  const merged: News[] = [];

  for (const article of allNews.flat()) {
    const normalizedLink = article.link.toLowerCase();
    if (!article.link || uniqueLinks.has(normalizedLink)) continue;
    uniqueLinks.add(normalizedLink);
    merged.push(article);
  }

  const sortedNews = merged
    .sort((a, b) => {
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  marketNewsCache.updatedAt = now;
  marketNewsCache.items = sortedNews;

  return sortedNews;
}

const chipThemes = [
  { label: "AI", slug: "ai" },
  { label: "Breakouts", slug: "breakouts" },
  { label: "Crypto", slug: "crypto" },
  { label: "Options", slug: "options" },
  { label: "Futures", slug: "futures" },
  { label: "Commodities", slug: "commodities" },
  { label: "Earnings", slug: "earnings" },
  { label: "Mean Reversion", slug: "mean-reversion" },
  { label: "Swing", slug: "swing" },
];

function ChangePill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${
        up
          ? "text-emerald-300 border-emerald-300/30 bg-emerald-300/10"
          : "text-red-300 border-red-300/30 bg-red-300/10"
      }`}
    >
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export default async function HomePage() {
  const latestNews = await getLatestMarketNews();
  const normalizedSiteUrl = siteUrl.replace(/\/$/, "");

  const newsSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "SnapCharts Market Headlines",
    url: `${normalizedSiteUrl}/`,
    hasPart: {
      "@type": "ItemList",
      itemListOrder: "http://schema.org/ItemListOrderDescending",
      itemListElement: latestNews.map((news, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "NewsArticle",
          headline: news.title,
          url: news.link,
          ...(news.publishedAt ? { datePublished: news.publishedAt } : {}),
          source: {
            "@type": "Organization",
            name: news.publisher,
          },
          image: news.image || newsImageFallback,
        },
      })),
    },
  };

  return (
    <div className="min-h-screen">
      <Header showSearch={false} />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsSchema) }}
      />
      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/20 border border-zinc-800 rounded-3xl p-6 md:p-8">
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-[0.22em]">
              SnapCharts
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-white">
              Explore markets and share chart ideas in real-time.
            </h1>
            <p className="mt-3 text-zinc-400 max-w-2xl">
              Find symbols quickly, open a live chart page with stats, and share your
              chart analysis ideas while you monitor stocks, crypto, and futures.
            </p>
            <div className="mt-6 max-w-2xl">
              <SearchBox large />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 pb-10">
          <div>
            <SectionHeading
              title="Market Pulse"
              description="Fast movers across stocks, crypto, and futures"
            />
            <div className="grid lg:grid-cols-3 gap-4 mt-4">
              {marketPulse.map((group) => (
                <div
                  key={group.title}
                  className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${group.color} p-4`}
                >
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {group.title}
                  </h3>
                  <div className="mt-4 divide-y divide-zinc-700/40">
                    {group.items.map((item) => (
                      <Link
                        key={item.symbol}
                        href={`/chart/${encodeURIComponent(item.symbol)}`}
                        className="py-3 flex items-center justify-between hover:text-blue-300"
                      >
                        <div>
                          <p className="text-sm text-white">{item.symbol}</p>
                          <p className="text-[11px] text-zinc-500">{item.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{item.price ?? "—"}</p>
                          <ChangePill value={item.change} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <SectionHeading
              title="Discover"
              description="Filter by market setup"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {chipThemes.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/discover?topic=${tag.slug}`}
                  className="px-3 py-2 rounded-full text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors min-h-8 touch-manipulation"
                >
                  {tag.label}
                </Link>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            <section className="bg-zinc-900/45 border border-zinc-800 rounded-2xl p-5">
              <SectionHeading title="Trending watchlists" description="Quick picks used by active users" />
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                {watchlists.map((list) => (
                  <div key={list.title} className="bg-zinc-800/45 border border-zinc-700 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white">{list.title}</h3>
                    <p className="text-zinc-500 text-xs mt-2">{list.symbols.join(" • ")}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-zinc-900/45 border border-zinc-800 rounded-2xl p-5">
              <SectionHeading title="Latest market headlines" description="Signals worth watching" />
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestNews.map((item) => (
                  <a
                    key={`${item.publisher}-${item.title}`}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all group flex gap-4"
                  >
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        width={160}
                        height={160}
                        sizes="(max-width: 768px) 80px, 160px"
                        className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-zinc-800"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-200 group-hover:text-blue-400 transition-colors line-clamp-2 mb-1.5">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <span>{item.publisher}</span>
                        <span className="text-zinc-700">•</span>
                        <span>
                          {item.publishedAt ? timeAgo(item.publishedAt) : "Recent"}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </div>
        </section>

        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-center text-[11px] text-zinc-500 leading-relaxed">
            Educational content only. Not investment advice. Always perform your own due
            diligence and risk checks.
          </p>
        </footer>
      </main>
    </div>
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
      <p className="text-zinc-500 text-sm">{description}</p>
    </div>
  );
}
