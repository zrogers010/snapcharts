# ProStockCharts — Stock Charts & Financial Data

A fast, modern stock market dashboard with interactive charts, key statistics, financial metrics, company profiles, and news — powered by Yahoo Finance data. Live at [prostockcharts.com](https://prostockcharts.com).

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Real-time quotes** — price, change, volume, market cap, and more
- **Interactive charts** — area and candlestick views with 1D / 5D / 1M / 3M / 6M / 1Y / 5Y ranges (via [TradingView Lightweight Charts](https://github.com/nickvdyck/lightweight-charts))
- **Financial metrics** — revenue, margins, cash flow, analyst targets
- **Company profiles** — sector, industry, HQ, CEO, business summary
- **Latest news** — headline feed per ticker
- **Instant search** — type-ahead search for stocks, ETFs, and indices

No API keys required — data is fetched server-side from Yahoo Finance.

---

## Quick Start (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20 recommended)
- npm (comes with Node.js)

### 1. Clone the repo

```bash
git clone https://github.com/zrogers010/pro-stock-charts.git
cd pro-stock-charts
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build (without Docker)

```bash
npm run build
npm start
```

The app will be available on port **3000** by default.

---

## Deploy with Docker

A multi-stage Dockerfile is included for lightweight production images.

### Build the image

```bash
docker build -t prostockcharts .
```

### Run the container

```bash
docker run -p 3000:3000 prostockcharts
```

The app is now live at [http://localhost:3000](http://localhost:3000).

### Environment variables (optional)

| Variable   | Default   | Description              |
| ---------- | --------- | ------------------------ |
| `PORT`     | `3000`    | Port the server binds to |
| `HOSTNAME` | `0.0.0.0` | Host the server binds to |

Example:

```bash
docker run -p 8080:8080 -e PORT=8080 prostockcharts
```

---

## Project Structure

```
├── app/
│   ├── api/                 # Server-side API routes
│   │   ├── chart/[symbol]/  # Historical OHLCV data
│   │   ├── news/[symbol]/   # News feed per symbol
│   │   ├── quote/[symbol]/  # Quote + financial summary
│   │   └── search/          # Ticker search
│   ├── stock/[symbol]/      # Stock detail page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css
├── components/
│   ├── Header.tsx           # Sticky header with search
│   ├── SearchBox.tsx        # Type-ahead search component
│   └── StockChart.tsx       # TradingView chart component
├── lib/
│   ├── format.ts            # Number/currency/date formatters
│   └── yahoo.ts             # Yahoo Finance client
├── Dockerfile               # Production Docker build
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Tech Stack

- **[Next.js 14](https://nextjs.org/)** — App Router, API routes, server components
- **[TailwindCSS](https://tailwindcss.com/)** — Utility-first styling
- **[Lightweight Charts](https://tradingview.github.io/lightweight-charts/)** — Interactive financial charts
- **[yahoo-finance2](https://github.com/nickvdyck/yahoo-finance2)** — Yahoo Finance data (no API key needed)

---

## License

MIT
