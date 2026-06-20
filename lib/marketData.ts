import yahooFinance from "@/lib/yahoo";

export type MarketQuote = {
  symbol: string;
  name: string;
  price: string;
  change: number;
  changePercent: number;
  updatedAt: string | null;
  volume?: number;
  marketCap?: number;
};

export type QuoteSeed = {
  symbol: string;
  name: string;
};

type QuoteCacheEntry = {
  updatedAt: number;
  quote: MarketQuote;
};

const quoteCache = new Map<string, QuoteCacheEntry>();
const QUOTE_CACHE_TTL_MS = 2 * 60 * 1000;

export const allowedRemoteImageHosts = [
  "assets.bwbx.io",
  "cloudfront-us-east-2.images.arcpublishing.com",
  "image.cnbcfm.com",
  "images.wsj.net",
  "media.zenfs.com",
  "placehold.co",
  "s.yimg.com",
  "static.reuters.com",
  "static.seekingalpha.com",
];

export function getSafeRemoteImageUrl(
  imageUrl: unknown,
  fallbackUrl: string
): string {
  if (typeof imageUrl !== "string" || imageUrl.length === 0) return fallbackUrl;

  try {
    const parsed = new URL(imageUrl);
    if (
      parsed.protocol === "https:" &&
      allowedRemoteImageHosts.includes(parsed.hostname)
    ) {
      return imageUrl;
    }
  } catch {
    return fallbackUrl;
  }

  return fallbackUrl;
}

export function formatQuotePrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

async function fetchMarketQuote(seed: QuoteSeed): Promise<MarketQuote> {
  const cached = quoteCache.get(seed.symbol);
  const now = Date.now();
  if (cached && now - cached.updatedAt < QUOTE_CACHE_TTL_MS) {
    return cached.quote;
  }

  try {
    const quote = await yahooFinance.quote(seed.symbol);
    const price =
      (quote as any).regularMarketPrice ??
      (quote as any).postMarketPrice ??
      (quote as any).preMarketPrice;
    const change = Number((quote as any).regularMarketChange ?? 0);
    const changePercent = Number((quote as any).regularMarketChangePercent ?? 0);
    const updatedAt =
      typeof (quote as any).regularMarketTime === "number"
        ? new Date((quote as any).regularMarketTime * 1000).toISOString()
        : null;

    const marketQuote: MarketQuote = {
      symbol: seed.symbol,
      name: (quote as any).shortName || (quote as any).longName || seed.name,
      price: formatQuotePrice(price),
      change,
      changePercent,
      updatedAt,
      volume: (quote as any).regularMarketVolume,
      marketCap: (quote as any).marketCap,
    };

    quoteCache.set(seed.symbol, { updatedAt: now, quote: marketQuote });
    return marketQuote;
  } catch {
    return {
      symbol: seed.symbol,
      name: seed.name,
      price: "—",
      change: 0,
      changePercent: 0,
      updatedAt: null,
    };
  }
}

export async function getMarketQuotes(
  seeds: QuoteSeed[]
): Promise<MarketQuote[]> {
  return Promise.all(seeds.map((seed) => fetchMarketQuote(seed)));
}

