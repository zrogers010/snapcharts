import { NextRequest, NextResponse } from "next/server";

type SearchItem = {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  region: string;
};

const normalizeText = (value: string) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

const normalizeSymbolText = (value: string) => String(value || "").trim().toUpperCase();

const isUsStock = (item: SearchItem) => {
  if (item.type !== "EQUITY") return false;
  if (!item.symbol || item.symbol.includes("=")) return false;
  if (item.region && item.region.toUpperCase() !== "US") return false;

  if (item.symbol.includes(".") && /\.[A-Z0-9]{2,}$/.test(item.symbol)) {
    return false;
  }

  const exch = item.exchange.toUpperCase();
  return /NYSE|NASDAQ|NMS|NYQ|AMEX|ARCA|BATS/.test(exch);
};

const mapResult = (item: Record<string, unknown>): SearchItem | null => {
  const symbol = normalizeSymbolText(String(item.symbol ?? ""));
  if (!symbol) return null;

  const name = String(
    item.shortname ?? item.longname ?? item.name ?? symbol
  ).trim();

  return {
    symbol,
    name: normalizeText(name),
    type: normalizeText(String(item.quoteType ?? "EQUITY")),
    exchange: String(item.exchDisp ?? item.exchange ?? ""),
    region: String(item.region ?? ""),
  };
};

const getQuotes = (payload: unknown): Record<string, unknown>[] => {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.quotes)) return root.quotes as Record<string, unknown>[];

  const finance = root.finance as { result?: unknown[] } | undefined;
  const firstResult =
    finance && Array.isArray(finance.result) ? finance.result[0] : undefined;

  if (
    firstResult &&
    typeof firstResult === "object" &&
    Array.isArray((firstResult as { quotes?: unknown[] }).quotes)
  ) {
    return (firstResult as { quotes?: unknown[] }).quotes as
      | Record<string, unknown>[]
      | [];
  }

  return [];
};

const fetchYahooSearch = async (query: string): Promise<SearchItem[]> => {
  const endpoint = new URL("https://query2.finance.yahoo.com/v1/finance/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("quotesCount", "100");
  endpoint.searchParams.set("newsCount", "0");
  endpoint.searchParams.set("lang", "en-US");
  endpoint.searchParams.set("region", "US");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0",
    },
    cache: "no-store",
  });

  if (!response.ok) return [];

  const payload = await response.json().catch(() => null);
  return getQuotes(payload)
    .map((item) => mapResult(item as Record<string, unknown>))
    .filter((item): item is SearchItem => Boolean(item));
};

const buildSearchQueries = (query: string): string[] => {
  const variants = new Set([query]);

  if (query.length >= 2) {
    variants.add(query.slice(0, -1));
    variants.add(query.slice(1));
  }

  if (query.length >= 3) {
    const chars = query.split("");

    for (let i = 0; i < chars.length - 1; i++) {
      const swapped = [...chars];
      const a = swapped[i];
      const b = swapped[i + 1];
      if (a === b) continue;
      swapped[i] = b;
      swapped[i + 1] = a;
      variants.add(swapped.join(""));
    }

    for (let i = 0; i < chars.length; i++) {
      const removed = [...chars.slice(0, i), ...chars.slice(i + 1)].join("");
      if (removed.length > 1) {
        variants.add(removed);
      }
    }
  }

  return Array.from(variants).filter((value) => value.length > 0).slice(0, 8);
};

const levenshtein = (a: string, b: string): number => {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
};

const similarityScore = (a: string, b: string) => {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return Math.max(0, (1 - distance / maxLen) * 100);
};

const tokenMatchScore = (source: string, query: string) => {
  const words = source.split(" ");
  let score = 0;

  for (const word of words) {
    if (!word) continue;
    if (word === query) score += 160;
    else if (word.startsWith(query)) score += 130;
    else if (word.includes(query)) score += 60;
  }

  return score;
};

const bestSimilarity = (source: string, query: string) => {
  const words = source.split(" ");
  let best = similarityScore(query, source);

  for (const word of words) {
    if (!word) continue;
    const current = similarityScore(query, word);
    if (current > best) best = current;
  }

  return best;
};

const rankItem = (item: SearchItem, query: string) => {
  const symbol = item.symbol;
  const name = item.name;
  const shortSymbol = symbol.split(".")[0];
  let score = 0;

  if (symbol === query) score += 9000;
  if (name === query) score += 8600;
  if (symbol.startsWith(query)) score += 5400;
  if (name.startsWith(query)) score += 4600;
  if (symbol.includes(query)) score += 2500;
  if (name.includes(query)) score += 2100;

  score += tokenMatchScore(name, query) * 10;
  score += tokenMatchScore(shortSymbol, query) * 10;
  score += bestSimilarity(symbol, query) * 6;
  score += bestSimilarity(name, query) * 5;

  // Keep class-share style symbols out unless they are clear matches.
  if (/^[A-Z]{1,5}$/.test(shortSymbol)) score += 220;

  return score;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  const query = normalizeText(q);
  if (!query) return NextResponse.json({ results: [] });

  try {
    const queryVariants = buildSearchQueries(query);
    const resultSets = await Promise.all(queryVariants.map(fetchYahooSearch));
    const usOnly = new Map<string, SearchItem>();

    for (const results of resultSets) {
      for (const item of results) {
        if (!isUsStock(item)) continue;
        if (!usOnly.has(item.symbol)) {
          usOnly.set(item.symbol, item);
        }
      }
    }

    const ranked = Array.from(usOnly.values())
      .map((item) => ({
        ...item,
        _score: rankItem(item, query),
      }))
      .filter((item) => item._score > 0)
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;

        const aSymbolPrefix = a.symbol.startsWith(query);
        const bSymbolPrefix = b.symbol.startsWith(query);
        if (aSymbolPrefix !== bSymbolPrefix) return aSymbolPrefix ? -1 : 1;

        const aNamePrefix = a.name.startsWith(query);
        const bNamePrefix = b.name.startsWith(query);
        if (aNamePrefix !== bNamePrefix) return aNamePrefix ? -1 : 1;

        return a.symbol.localeCompare(b.symbol);
      });

    const payload = ranked.slice(0, 40).map(({ _score, ...item }) => item);
    return NextResponse.json({ results: payload });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
