"use client";

import Link from "next/link";
import SearchBox from "./SearchBox";

type HeaderProps = {
  showSearch?: boolean;
};

export default function Header({ showSearch = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 relative overflow-hidden">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6 6h36v36H6z"
                  fill="rgba(9,9,11,0.25)"
                />
                <rect
                  x="11"
                  y="12"
                  width="26"
                  height="20"
                  rx="3"
                  fill="none"
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth="2"
                />
                <rect
                  x="11"
                  y="28"
                  width="6"
                  height="4"
                  fill="rgba(125,211,252,0.85)"
                  rx="1"
                />
                <rect
                  x="20"
                  y="24"
                  width="6"
                  height="8"
                  fill="rgba(96,165,250,0.95)"
                  rx="1"
                />
                <rect
                  x="29"
                  y="20"
                  width="6"
                  height="12"
                  fill="rgba(165,243,252,0.95)"
                  rx="1"
                />
                <path
                  d="M11 30L16 23L23 25L30 20L37 16"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="37" cy="16" r="4.2" fill="rgba(255,255,255,0.95)" />
                <path
                  d="M34.2 16C34.2 18.1 35.9 19.8 38 19.8C40.1 19.8 41.8 18.1 41.8 16C41.8 13.9 40.1 12.2 38 12.2C35.9 12.2 34.2 13.9 34.2 16Z"
                  fill="rgba(9,9,11,0.95)"
                />
              </svg>
            </div>
            <span className="text-base font-semibold text-white tracking-tight">
              SnapCharts
            </span>
          </Link>
          {showSearch ? (
            <div className="flex-1 max-w-lg mx-6">
              <SearchBox />
            </div>
          ) : null}
          <div className={`${showSearch ? "hidden sm:block w-20" : "w-0"}`} />
        </div>
      </div>
    </header>
  );
}
