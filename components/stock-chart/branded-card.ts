import type { ChartRange } from "./types";

interface QuoteData {
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  symbol?: string;
}

interface ChartPoint {
  close: number;
  time: number | string;
}

interface BrandedCardOptions {
  symbol: string;
  range: ChartRange;
  quoteData: QuoteData;
  chartData: ChartPoint[];
}

export async function createBrandedCard({
  symbol,
  range,
  quoteData,
  chartData,
}: BrandedCardOptions): Promise<string | undefined> {
  try {
    const canvas = document.createElement("canvas");
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const price = quoteData.regularMarketPrice ?? 0;
    const change = quoteData.regularMarketChange ?? 0;
    const changePercent = quoteData.regularMarketChangePercent ?? 0;
    const isPositive = change >= 0;

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);

    const headerHeight = 80;
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, headerHeight);

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "600 24px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("SnapCharts", 40, headerHeight / 2);

    const contentTop = headerHeight + 60;
    ctx.fillStyle = "#fafafa";
    ctx.font = "700 48px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(symbol.toUpperCase(), 40, contentTop);

    const priceTop = contentTop + 70;
    ctx.fillStyle = "#fafafa";
    ctx.font = "700 64px system-ui, -apple-system, sans-serif";
    const formattedPrice =
      price < 1
        ? price.toFixed(4)
        : price < 100
        ? price.toFixed(2)
        : price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    ctx.fillText(`$${formattedPrice}`, 40, priceTop);

    const changeTop = priceTop + 85;
    ctx.fillStyle = isPositive ? "#22c55e" : "#ef4444";
    ctx.font = "600 32px system-ui, -apple-system, sans-serif";
    const changeSign = isPositive ? "+" : "";
    const changeText = `${changeSign}$${Math.abs(change).toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
    ctx.fillText(changeText, 40, changeTop);

    if (chartData.length > 1) {
      const sparklineLeft = 40;
      const sparklineTop = changeTop + 80;
      const sparklineWidth = width - 80;
      const sparklineHeight = 180;

      const prices = chartData.map((d) => d.close);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice || 1;

      ctx.strokeStyle = isPositive ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      chartData.forEach((point, index) => {
        const x =
          sparklineLeft + (index / (chartData.length - 1)) * sparklineWidth;
        const y =
          sparklineTop +
          sparklineHeight -
          ((point.close - minPrice) / priceRange) * sparklineHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    const footerTop = height - 60;
    ctx.fillStyle = "#52525b";
    ctx.font = "500 18px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${range.toUpperCase()} • Created ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date())}`,
      40,
      footerTop
    );

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to create branded card:", error);
    return undefined;
  }
}
