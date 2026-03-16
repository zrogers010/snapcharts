import type { TradingViewWindow } from "@/components/stock-chart/types";

export const loadTradingViewScript = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject();

  const win = window as TradingViewWindow;
  const existing = document.getElementById("tradingview-widget-script");

  if (win.TradingView?.widget) {
    return Promise.resolve();
  }

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("TradingView script failed to load"))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "tradingview-widget-script";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("TradingView script failed to load"));
    document.head.appendChild(script);
  });
};
