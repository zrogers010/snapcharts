"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import StockChart from "@/components/StockChart";
import {
  formatCurrency,
  formatLargeNumber,
  formatPercent,
  formatNumber,
  timeAgo,
} from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuoteData {
  symbol: string;
  shortName?: string;
  longName?: string;
  quoteType?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  exchange?: string;
  fullExchangeName?: string;
  circulatingSupply?: number;
  volume24Hr?: number;
  volumeAllCurrencies?: number;
}

interface SummaryData {
  assetProfile?: {
    sector?: string;
    industry?: string;
    fullTimeEmployees?: number;
    longBusinessSummary?: string;
    website?: string;
    city?: string;
    state?: string;
    country?: string;
    companyOfficers?: Array<{ name: string; title: string }>;
  };
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    dividendYield?: number;
    dividendRate?: number;
    beta?: number;
    fiftyDayAverage?: number;
    twoHundredDayAverage?: number;
    trailingAnnualDividendYield?: number;
    payoutRatio?: number;
    exDividendDate?: string;
  };
  financialData?: {
    totalRevenue?: number;
    revenueGrowth?: number;
    grossMargins?: number;
    operatingMargins?: number;
    profitMargins?: number;
    returnOnEquity?: number;
    targetMeanPrice?: number;
    recommendationMean?: number;
    recommendationKey?: string;
    numberOfAnalystOpinions?: number;
    earningsGrowth?: number;
    currentPrice?: number;
    totalCash?: number;
    totalDebt?: number;
    freeCashflow?: number;
  };
  defaultKeyStatistics?: {
    trailingEps?: number;
    forwardEps?: number;
    pegRatio?: number;
    priceToBook?: number;
    enterpriseValue?: number;
    sharesOutstanding?: number;
    floatShares?: number;
    shortRatio?: number;
    shortPercentOfFloat?: number;
    earningsQuarterlyGrowth?: number;
  };
}

interface NewsArticle {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string | null;
  thumbnail: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StockView({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/quote/${symbol}`).then((r) => r.json()),
      fetch(`/api/news/${symbol}`).then((r) => r.json()),
    ])
      .then(([quoteData, newsData]) => {
        if (quoteData.error) {
          setError("Could not find stock data for this symbol.");
          return;
        }
        setQuote(quoteData.quote);
        setSummary(quoteData.summary);
        setNews(newsData.news || []);
      })
      .catch(() => setError("Failed to load stock data."))
      .finally(() => setIsLoading(false));
  }, [symbol]);

  /* Loading state */
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton />
        </div>
      </div>
    );
  }

  /* Error state */
  if (error || !quote) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="text-5xl mb-4">📉</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Symbol Not Found
          </h2>
          <p className="text-zinc-400 max-w-sm mx-auto">
            {error || `We couldn't find data for "${symbol}".`}
          </p>
        </div>
      </div>
    );
  }

  const isPositive = (quote.regularMarketChange || 0) >= 0;
  const changeColor = isPositive ? "text-emerald-400" : "text-red-400";
  const changeBg = isPositive ? "bg-emerald-400/10" : "bg-red-400/10";
  const profile = summary?.assetProfile;
  const detail = summary?.summaryDetail;
  const financial = summary?.financialData;
  const keyStats = summary?.defaultKeyStatistics;

  const quoteType = quote.quoteType || "EQUITY";
  const isCrypto = quoteType === "CRYPTOCURRENCY";
  const isFuture = quoteType === "FUTURE" || quoteType === "COMMODITY";
  const isEquityLike = !isCrypto && !isFuture;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Quote Header ─────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {symbol}
            </h1>
            <span className="text-zinc-400 text-base">
              {quote.shortName || quote.longName}
            </span>
            {(isCrypto || isFuture) && (
              <AssetTypeBadge type={quoteType} />
            )}
            {quote.fullExchangeName && (
              <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                {quote.fullExchangeName}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-bold text-white tracking-tight">
              {formatCurrency(quote.regularMarketPrice)}
            </span>
            <span
              className={`text-base font-semibold ${changeColor} ${changeBg} px-2.5 py-1 rounded-lg`}
            >
              {isPositive ? "+" : ""}
              {quote.regularMarketChange?.toFixed(2)} (
              {isPositive ? "+" : ""}
              {quote.regularMarketChangePercent?.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* ── Chart ────────────────────────────────────────────── */}
        <div className="mb-8">
          <StockChart symbol={symbol} />
        </div>

        {/* ── Stats + Company ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Key Statistics */}
          <div className="lg:col-span-1 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Key Statistics
            </h2>
            <div className="space-y-0">
              <StatRow
                label="Previous Close"
                value={formatCurrency(quote.regularMarketPreviousClose)}
              />
              <StatRow
                label="Open"
                value={formatCurrency(quote.regularMarketOpen)}
              />
              <StatRow
                label="Day Range"
                value={`${formatCurrency(quote.regularMarketDayLow)} — ${formatCurrency(quote.regularMarketDayHigh)}`}
              />
              <StatRow
                label="52 Wk Range"
                value={`${formatCurrency(quote.fiftyTwoWeekLow)} — ${formatCurrency(quote.fiftyTwoWeekHigh)}`}
              />
              <StatRow
                label="Volume"
                value={formatNumber(quote.regularMarketVolume)}
              />
              <StatRow
                label="Avg Volume"
                value={formatNumber(quote.averageDailyVolume3Month)}
              />
              {quote.marketCap != null && (
                <StatRow
                  label="Market Cap"
                  value={formatLargeNumber(quote.marketCap)}
                />
              )}
              {isCrypto && quote.circulatingSupply != null && (
                <StatRow
                  label="Circulating Supply"
                  value={formatLargeNumber(quote.circulatingSupply)}
                />
              )}
              {isCrypto && (quote.volume24Hr != null || quote.volumeAllCurrencies != null) && (
                <StatRow
                  label="24h Volume"
                  value={formatLargeNumber(quote.volume24Hr ?? quote.volumeAllCurrencies)}
                />
              )}
              {isEquityLike && (
                <>
                  <StatRow
                    label="P/E (TTM)"
                    value={detail?.trailingPE?.toFixed(2)}
                  />
                  <StatRow
                    label="P/E (Fwd)"
                    value={detail?.forwardPE?.toFixed(2)}
                  />
                  <StatRow
                    label="EPS (TTM)"
                    value={
                      keyStats?.trailingEps != null
                        ? `$${keyStats.trailingEps.toFixed(2)}`
                        : undefined
                    }
                  />
                  <StatRow
                    label="Dividend Yield"
                    value={
                      detail?.dividendYield != null
                        ? formatPercent(detail.dividendYield)
                        : undefined
                    }
                  />
                </>
              )}
              <StatRow label="Beta" value={detail?.beta?.toFixed(2)} />
              <StatRow
                label="50 Day Avg"
                value={formatCurrency(detail?.fiftyDayAverage)}
              />
              <StatRow
                label="200 Day Avg"
                value={formatCurrency(detail?.twoHundredDayAverage)}
              />
              {isEquityLike && (
                <>
                  <StatRow
                    label="Shares Out"
                    value={
                      keyStats?.sharesOutstanding != null
                        ? formatLargeNumber(keyStats.sharesOutstanding)
                        : undefined
                    }
                  />
                  <StatRow
                    label="PEG Ratio"
                    value={keyStats?.pegRatio?.toFixed(2)}
                  />
                  <StatRow
                    label="Price/Book"
                    value={keyStats?.priceToBook?.toFixed(2)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Metrics */}
            {financial && (
              <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  Financial Metrics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {financial.totalRevenue != null && (
                    <MetricCard
                      label="Revenue"
                      value={formatLargeNumber(financial.totalRevenue)}
                    />
                  )}
                  {financial.revenueGrowth != null && (
                    <MetricCard
                      label="Revenue Growth"
                      value={formatPercent(financial.revenueGrowth)}
                    />
                  )}
                  {financial.grossMargins != null && (
                    <MetricCard
                      label="Gross Margin"
                      value={formatPercent(financial.grossMargins)}
                    />
                  )}
                  {financial.operatingMargins != null && (
                    <MetricCard
                      label="Operating Margin"
                      value={formatPercent(financial.operatingMargins)}
                    />
                  )}
                  {financial.profitMargins != null && (
                    <MetricCard
                      label="Profit Margin"
                      value={formatPercent(financial.profitMargins)}
                    />
                  )}
                  {financial.returnOnEquity != null && (
                    <MetricCard
                      label="Return on Equity"
                      value={formatPercent(financial.returnOnEquity)}
                    />
                  )}
                  {financial.totalCash != null && (
                    <MetricCard
                      label="Total Cash"
                      value={formatLargeNumber(financial.totalCash)}
                    />
                  )}
                  {financial.totalDebt != null && (
                    <MetricCard
                      label="Total Debt"
                      value={formatLargeNumber(financial.totalDebt)}
                    />
                  )}
                  {financial.freeCashflow != null && (
                    <MetricCard
                      label="Free Cash Flow"
                      value={formatLargeNumber(financial.freeCashflow)}
                    />
                  )}
                  {financial.targetMeanPrice != null && (
                    <MetricCard
                      label="Analyst Target"
                      value={formatCurrency(financial.targetMeanPrice)}
                    />
                  )}
                  {financial.recommendationKey && (
                    <MetricCard
                      label="Recommendation"
                      value={financial.recommendationKey.toUpperCase()}
                      accent
                    />
                  )}
                  {financial.numberOfAnalystOpinions != null && (
                    <MetricCard
                      label="Analyst Opinions"
                      value={financial.numberOfAnalystOpinions.toString()}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Company Profile */}
            {profile && (
              <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  About {quote.shortName || symbol}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mb-4">
                  {profile.sector && (
                    <InfoItem label="Sector" value={profile.sector} />
                  )}
                  {profile.industry && (
                    <InfoItem label="Industry" value={profile.industry} />
                  )}
                  {profile.fullTimeEmployees != null && (
                    <InfoItem
                      label="Employees"
                      value={formatNumber(profile.fullTimeEmployees)}
                    />
                  )}
                  {profile.city && (
                    <InfoItem
                      label="Headquarters"
                      value={[profile.city, profile.state, profile.country]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                  {profile.website && (
                    <div>
                      <div className="text-[11px] text-zinc-500 mb-0.5">
                        Website
                      </div>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {profile.website.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </div>
                  )}
                  {profile.companyOfficers?.[0] && (
                    <InfoItem
                      label="CEO"
                      value={profile.companyOfficers[0].name}
                    />
                  )}
                </div>
                {profile.longBusinessSummary && (
                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">
                    {profile.longBusinessSummary}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── News ─────────────────────────────────────────────── */}
        {news.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Latest News
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {news.map((article, i) => (
                <a
                  key={i}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all group flex gap-4"
                >
                  {article.thumbnail && (
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-zinc-800"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-200 group-hover:text-blue-400 transition-colors line-clamp-2 mb-1.5">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      {article.publisher && <span>{article.publisher}</span>}
                      {article.publishedAt && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span>{timeAgo(article.publishedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
      <span className="text-[13px] text-zinc-500">{label}</span>
      <span className="text-[13px] text-white font-medium tabular-nums">
        {value ?? "—"}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-zinc-800/25 rounded-xl px-4 py-3">
      <div className="text-[11px] text-zinc-500 mb-1">{label}</div>
      <div
        className={`text-sm font-semibold ${accent ? "text-blue-400" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-500 mb-0.5">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </div>
  );
}

const assetTypeBadgeConfig: Record<string, { label: string; color: string }> = {
  CRYPTOCURRENCY: { label: "Crypto", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  FUTURE: { label: "Futures", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  COMMODITY: { label: "Commodity", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

function AssetTypeBadge({ type }: { type: string }) {
  const cfg = assetTypeBadgeConfig[type];
  if (!cfg) return null;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-7 bg-zinc-800/50 rounded w-20" />
        <div className="h-5 bg-zinc-800/50 rounded w-40" />
      </div>
      <div className="flex items-baseline gap-3 mb-8">
        <div className="h-10 bg-zinc-800/50 rounded w-44" />
        <div className="h-7 bg-zinc-800/50 rounded w-32" />
      </div>
      <div className="h-[480px] bg-zinc-800/30 rounded-2xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-[520px] bg-zinc-800/30 rounded-2xl" />
        <div className="lg:col-span-2 space-y-6">
          <div className="h-56 bg-zinc-800/30 rounded-2xl" />
          <div className="h-56 bg-zinc-800/30 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
