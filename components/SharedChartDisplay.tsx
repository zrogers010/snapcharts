"use client";

import { useState } from "react";
import StockChart from "@/components/StockChart";

type SharedChartDisplayProps = {
  symbol: string;
  range: string;
  imageSrc: string;
};

export default function SharedChartDisplay({
  symbol,
  range,
  imageSrc,
}: SharedChartDisplayProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return imageFailed ? (
    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs text-zinc-500 mb-1">
        Fallback view for {symbol.toUpperCase()} ({range.toUpperCase()})
      </p>
      <p className="text-sm text-zinc-300">
        Snapshot image could not be loaded, showing live chart instead.
      </p>
      <div className="mt-3">
        <StockChart symbol={symbol} />
      </div>
    </div>
  ) : (
    <img
      src={imageSrc}
      alt={`${symbol} chart snapshot`}
      className="mt-5 w-full rounded-xl border border-zinc-800 bg-black"
      onError={() => setImageFailed(true)}
    />
  );
}
