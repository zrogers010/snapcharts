export function formatCurrency(
  value: number | null | undefined
): string {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLargeNumber(
  value: number | null | undefined
): string {
  if (value == null || isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export function formatPercent(
  value: number | null | undefined
): string {
  if (value == null || isNaN(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatNumber(
  value: number | null | undefined
): string {
  if (value == null || isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(
  date: Date | string | number | null | undefined
): string {
  if (date == null) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function timeAgo(date: Date | string | number): string {
  const now = new Date();
  const d = new Date(typeof date === "number" ? date * 1000 : date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}
