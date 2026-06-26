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

type YahooQuote = {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | number | string;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  preMarketTime?: Date | number | string;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  postMarketTime?: Date | number | string;
  marketState?: string;
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

function toIsoTime(value: YahooQuote["regularMarketTime"]): string | null {
  if (value == null) return null;

  if (value instanceof Date) return value.toISOString();

  if (typeof value === "number") {
    const timestamp = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(timestamp).toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function firstFinite(...values: Array<number | undefined>): number | undefined {
  return values.find((value) => value != null && Number.isFinite(value));
}

export function selectQuoteSnapshot(quote: YahooQuote) {
  const marketState = quote.marketState?.toUpperCase();

  if (marketState === "PRE" || marketState === "PREPRE") {
    return {
      price: firstFinite(quote.preMarketPrice, quote.regularMarketPrice),
      change: firstFinite(quote.preMarketChange, quote.regularMarketChange) ?? 0,
      changePercent:
        firstFinite(
          quote.preMarketChangePercent,
          quote.regularMarketChangePercent
        ) ?? 0,
      updatedAt:
        toIsoTime(quote.preMarketTime) || toIsoTime(quote.regularMarketTime),
    };
  }

  if (marketState === "POST" || marketState === "POSTPOST") {
    return {
      price: firstFinite(quote.postMarketPrice, quote.regularMarketPrice),
      change:
        firstFinite(quote.postMarketChange, quote.regularMarketChange) ?? 0,
      changePercent:
        firstFinite(
          quote.postMarketChangePercent,
          quote.regularMarketChangePercent
        ) ?? 0,
      updatedAt:
        toIsoTime(quote.postMarketTime) || toIsoTime(quote.regularMarketTime),
    };
  }

  return {
    price: firstFinite(
      quote.regularMarketPrice,
      quote.postMarketPrice,
      quote.preMarketPrice
    ),
    change: firstFinite(quote.regularMarketChange) ?? 0,
    changePercent: firstFinite(quote.regularMarketChangePercent) ?? 0,
    updatedAt:
      toIsoTime(quote.regularMarketTime) ||
      toIsoTime(quote.postMarketTime) ||
      toIsoTime(quote.preMarketTime),
  };
}

async function fetchMarketQuote(seed: QuoteSeed): Promise<MarketQuote> {
  const cached = quoteCache.get(seed.symbol);
  const now = Date.now();
  if (cached && now - cached.updatedAt < QUOTE_CACHE_TTL_MS) {
    return cached.quote;
  }

  try {
    const quote = await yahooFinance.quote(seed.symbol);
    const snapshot = selectQuoteSnapshot(quote as YahooQuote);

    const marketQuote: MarketQuote = {
      symbol: seed.symbol,
      name: (quote as any).shortName || (quote as any).longName || seed.name,
      price: formatQuotePrice(snapshot.price),
      change: snapshot.change,
      changePercent: snapshot.changePercent,
      updatedAt: snapshot.updatedAt,
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
