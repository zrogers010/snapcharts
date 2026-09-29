"use client";

import { useEffect } from "react";
import { trackChartView } from "@/lib/analytics";

export function ChartViewTracker({ symbol }: { symbol: string }) {
  useEffect(() => {
    trackChartView(symbol);
  }, [symbol]);

  return null;
}
