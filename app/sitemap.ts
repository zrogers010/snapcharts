import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

type SitemapEntry = MetadataRoute.Sitemap[number];

const normalizedSiteUrl = getSiteUrl();

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

const liquidSymbols = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "META",
  "GOOGL",
  "AMD",
  "AMZN",
  "PLTR",
  "SPY",
  "QQQ",
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "ES=F",
  "NQ=F",
  "GC=F",
  "CL=F",
  "ZN=F",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticLastModified = new Date("2026-09-29T00:00:00Z");
  
  const topicEntries: SitemapEntry[] = discoverTopics.map((topic) => ({
    url: `${normalizedSiteUrl}/discover?topic=${topic}`,
    lastModified: staticLastModified,
    changeFrequency: "weekly",
    priority: 0.55,
  }));
  
  const symbolEntries: SitemapEntry[] = liquidSymbols.map((symbol) => ({
    url: `${normalizedSiteUrl}/chart/${encodeURIComponent(symbol)}`,
    lastModified: staticLastModified,
    changeFrequency: "daily",
    priority: 0.75,
  }));

  return [
    {
      url: normalizedSiteUrl + "/",
      lastModified: staticLastModified,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: normalizedSiteUrl + "/discover",
      lastModified: staticLastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...topicEntries,
    ...symbolEntries,
  ];
}
