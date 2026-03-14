import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import Link from "next/link";

const popularStocks = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "JPM", name: "JPMorgan Chase" },
];

const popularCrypto = [
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "SOL-USD", name: "Solana" },
  { symbol: "XRP-USD", name: "XRP" },
];

const popularCommodities = [
  { symbol: "GC=F", name: "Gold" },
  { symbol: "SI=F", name: "Silver" },
  { symbol: "CL=F", name: "Crude Oil" },
  { symbol: "NG=F", name: "Natural Gas" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Hero */}
        <div className="flex flex-col items-center justify-center px-4 pt-28 pb-20">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white text-center mb-3 tracking-tight">
            Charts & Market Data
          </h1>
          <p className="text-zinc-400 text-lg text-center mb-10 max-w-md">
            Stocks, crypto, commodities & futures. Professional charts, simple
            and free.
          </p>
          <div className="w-full max-w-xl">
            <SearchBox autoFocus large />
          </div>
        </div>

        {/* Popular Assets */}
        <div className="max-w-4xl mx-auto px-4 pb-24 space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Popular Stocks
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {popularStocks.map((stock) => (
                <Link
                  key={stock.symbol}
                  href={`/stock/${stock.symbol}`}
                  className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3.5 hover:bg-zinc-800/60 hover:border-zinc-700/60 transition-all group"
                >
                  <div className="font-semibold text-white group-hover:text-blue-400 transition-colors text-sm">
                    {stock.symbol}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    {stock.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Crypto
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {popularCrypto.map((item) => (
                <Link
                  key={item.symbol}
                  href={`/stock/${item.symbol}`}
                  className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3.5 hover:bg-zinc-800/60 hover:border-zinc-700/60 transition-all group"
                >
                  <div className="font-semibold text-white group-hover:text-amber-400 transition-colors text-sm">
                    {item.symbol}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Commodities & Futures
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {popularCommodities.map((item) => (
                <Link
                  key={item.symbol}
                  href={`/stock/${item.symbol}`}
                  className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3.5 hover:bg-zinc-800/60 hover:border-zinc-700/60 transition-all group"
                >
                  <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors text-sm">
                    {item.symbol}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
