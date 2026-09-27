declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, any>
    ) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

export function trackSearchSubmit(query: string) {
  trackEvent("search_submit", { search_term: query });
}

export function trackSearchResultClick(symbol: string, resultPosition?: number) {
  trackEvent("search_result_click", {
    symbol,
    ...(resultPosition !== undefined && { result_position: resultPosition }),
  });
}

export function trackChartView(symbol: string) {
  trackEvent("chart_view", { symbol });
}

export function trackDiscoverTopicSelect(topic: string) {
  trackEvent("discover_topic_select", { topic });
}
