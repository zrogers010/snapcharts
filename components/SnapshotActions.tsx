"use client";

import { useEffect, useState } from "react";
import { trackSnapShareClick, trackSnapToChart } from "@/lib/analytics";

export default function SnapshotActions({
  shareUrl,
  liveChartUrl,
  imageData,
}: {
  shareUrl: string;
  liveChartUrl: string;
  imageData: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      trackSnapShareClick("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", shareUrl);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SnapCharts Snapshot",
          text: "Check out this chart snapshot on SnapCharts",
          url: shareUrl,
        });
        trackSnapShareClick("native");
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageData;
    link.download = `snapcharts-snapshot-${Date.now()}.png`;
    link.rel = "noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => link.remove(), 0);
    trackSnapShareClick("download");
    setDownloadDone(true);
    window.setTimeout(() => setDownloadDone(false), 1500);
  };

  const handleLiveChartClick = () => {
    const symbol = liveChartUrl.split("/").pop() || "";
    trackSnapToChart(symbol);
  };

  return (
    <div className="mt-5 flex flex-col sm:flex-row gap-3">
      <a
        href={liveChartUrl}
        onClick={handleLiveChartClick}
        className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/25"
      >
        Open live chart
      </a>
      <button
        type="button"
        onClick={copyShareUrl}
        className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/70 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
      >
        {copied ? "✓ Link copied" : "Copy share link"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/70 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
        >
          Share...
        </button>
      )}
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/70 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
      >
        {downloadDone ? "✓ Downloaded" : "Download PNG"}
      </button>
    </div>
  );
}
