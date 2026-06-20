"use client";

import { useState } from "react";

export default function SnapshotActions({
  shareUrl,
  liveChartUrl,
}: {
  shareUrl: string;
  liveChartUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", shareUrl);
    }
  };

  return (
    <div className="mt-5 flex flex-col sm:flex-row gap-3">
      <a
        href={liveChartUrl}
        className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/25"
      >
        Open live chart
      </a>
      <button
        type="button"
        onClick={copyShareUrl}
        className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/70 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
      >
        {copied ? "Link copied" : "Copy share link"}
      </button>
    </div>
  );
}
