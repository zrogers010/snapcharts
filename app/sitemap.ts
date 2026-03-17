import { MetadataRoute } from "next";

type SitemapEntry = MetadataRoute.Sitemap[number];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://snap-charts.com";
const normalizedSiteUrl = siteUrl.replace(/\/$/, "");

const discoverTopics = [
  "ai",
  "breakouts",
  "crypto",
  "options",
  "futures",
  "commodities",
  "earnings",
  "mean-reversion",
  "swing",
];

const trendingSymbols = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "META",
  "BTC-USD",
  "ETH-USD",
  "ES=F",
  "SPY",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date();
  const topicEntries: SitemapEntry[] = discoverTopics.map((topic) => ({
    url: `${normalizedSiteUrl}/discover?topic=${topic}`,
    lastModified: today,
    changeFrequency: "weekly",
    priority: 0.55,
  }));
  const symbolEntries: SitemapEntry[] = trendingSymbols.map((symbol) => ({
    url: `${normalizedSiteUrl}/chart/${encodeURIComponent(symbol)}`,
    lastModified: today,
    changeFrequency: "daily",
    priority: 0.75,
  }));

  return [
    {
      url: normalizedSiteUrl + "/",
      lastModified: today,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: normalizedSiteUrl + "/discover",
      lastModified: today,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...topicEntries,
    ...symbolEntries,
  ];
}
