# Sitemap Smoke Test

This document describes how to verify the sitemap is production-ready.

## Quick Verification

### 1. Check sitemap returns 200 and valid XML

```bash
curl -sI https://snapcharts.com/sitemap.xml
```

Expected:
- HTTP 200 status
- `content-type: application/xml`

### 2. Verify sitemap contains expected URLs

```bash
curl -s https://snapcharts.com/sitemap.xml | grep -E "<loc>" | head -30
```

Expected content:
- ✅ Homepage: `https://snapcharts.com/`
- ✅ Discover page: `https://snapcharts.com/discover`
- ✅ Discover topics (9 topics): `https://snapcharts.com/discover?topic=ai`, etc.
- ✅ Chart symbol pages (20+ liquid symbols): `https://snapcharts.com/chart/AAPL`, etc.
- ✅ Special characters encoded correctly: `ES%3DF` (not `ES=F`), `NQ%3DF`, etc.

### 3. Verify NO share IDs in sitemap

Share IDs use format like `{timestamp}_{random}` (e.g., `lzj3k8v2_a1b2c3d4`).

```bash
curl -s https://snapcharts.com/sitemap.xml | grep -E "/chart/[^<]+_[^<]+"
```

Expected: **No results** (empty output means no share IDs found)

### 4. Verify robots.txt references sitemap

```bash
curl -s https://snapcharts.com/robots.txt
```

Expected:
```
User-Agent: *
Disallow: /api/

Sitemap: https://snapcharts.com/sitemap.xml
```

### 5. Verify symbol encoding in actual sitemap XML

```bash
curl -s https://snapcharts.com/sitemap.xml | grep "ES%3DF\|NQ%3DF\|CL%3DF\|GC%3DF"
```

Expected: Multiple matches showing properly encoded futures symbols with `%3D` (URL-encoded `=`)

## Local Testing

For local testing against `localhost:3456`:

```bash
# Start server
npm run build
PORT=3456 npm start

# Run checks (in another terminal)
curl -sI http://localhost:3456/sitemap.xml | head -10
curl -s http://localhost:3456/sitemap.xml | grep -E "<loc>" | head -30
curl -s http://localhost:3456/sitemap.xml | grep -E "/chart/[^<]+_[^<]+"
curl -s http://localhost:3456/robots.txt
```

## Implementation Details

### Symbols Included (Liquid Markets Only)

**Mega-cap Stocks:**
- AAPL, MSFT, NVDA, TSLA, META, GOOGL, AMD, AMZN, PLTR

**ETFs:**
- SPY, QQQ

**Crypto:**
- BTC-USD, ETH-USD, SOL-USD

**Futures:**
- ES=F (S&P 500), NQ=F (Nasdaq), GC=F (Gold), CL=F (Crude Oil), ZN=F (10Y T-Note)

### Discover Topics

All topics from homepage chips:
- ai, breakouts, crypto, options, futures, commodities, earnings, mean-reversion, swing

### SEO Settings

- **Homepage**: priority=1, changefreq=hourly
- **/discover**: priority=0.8, changefreq=daily
- **Discover topics**: priority=0.55, changefreq=weekly
- **Chart symbols**: priority=0.75, changefreq=daily
- **lastModified**: Static date (2026-09-29) to avoid sitemap churn

### What's NOT Included

- ❌ Share IDs (ephemeral, short-lived)
- ❌ API routes (disallowed in robots.txt)
- ❌ Less liquid symbols (prevents sitemap bloat)

## Integration with `smoke-routes.mjs`

The existing `scripts/smoke-routes.mjs` already tests:
- `/sitemap.xml` returns 200
- Response body contains `"snapcharts.com"`

For enhanced sitemap-specific checks, run the manual curl commands above.
