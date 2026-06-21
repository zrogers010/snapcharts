export const DEFAULT_SITE_URL = "https://snapcharts.com";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function getGoogleAnalyticsId() {
  return process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
}
