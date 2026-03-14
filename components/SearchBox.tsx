"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export default function SearchBox({
  autoFocus = false,
  large = false,
}: {
  autoFocus?: boolean;
  large?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setIsOpen(true);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const navigate = (symbol: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/stock/${symbol}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        navigate(results[selectedIndex].symbol);
      } else if (query.trim()) {
        navigate(query.trim().toUpperCase());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut: press "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName || ""
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`relative flex items-center ${large ? "text-base" : "text-sm"}`}
      >
        <svg
          className={`absolute left-3.5 ${large ? "w-5 h-5" : "w-4 h-4"} text-zinc-500 pointer-events-none`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search stocks, crypto, commodities..."
          autoFocus={autoFocus}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/50 transition-all ${
            large ? "pl-12 pr-4 py-3.5" : "pl-10 pr-4 py-2"
          }`}
        />
        {isLoading && (
          <div className="absolute right-3">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && !large && (
          <div className="absolute right-3 text-[10px] text-zinc-600 font-mono border border-zinc-800 rounded px-1.5 py-0.5">
            /
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={result.symbol}
              onClick={() => navigate(result.symbol)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${
                index === selectedIndex
                  ? "bg-zinc-800"
                  : "hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-white text-sm flex-shrink-0">
                  {result.symbol}
                </span>
                <span className="text-zinc-400 text-sm truncate">
                  {result.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <TypeBadge type={result.type} />
                <span className="text-[10px] text-zinc-600 uppercase">
                  {result.exchange}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const typeConfig: Record<string, { label: string; color: string }> = {
  EQUITY: { label: "Stock", color: "text-blue-400 bg-blue-400/10" },
  ETF: { label: "ETF", color: "text-violet-400 bg-violet-400/10" },
  INDEX: { label: "Index", color: "text-zinc-400 bg-zinc-400/10" },
  CRYPTOCURRENCY: { label: "Crypto", color: "text-amber-400 bg-amber-400/10" },
  FUTURE: { label: "Futures", color: "text-emerald-400 bg-emerald-400/10" },
  COMMODITY: { label: "Commodity", color: "text-emerald-400 bg-emerald-400/10" },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = typeConfig[type] || { label: type, color: "text-zinc-500 bg-zinc-500/10" };
  return (
    <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
