import { describe, expect, it } from "vitest";
import {
  formatQuotePrice,
  getSafeRemoteImageUrl,
  selectQuoteSnapshot,
} from "./marketData";

const fallbackUrl = "https://placehold.co/160x160/0f172a/94a3b8?text=SnapCharts";

describe("market data helpers", () => {
  it("formats quote prices with market-friendly precision", () => {
    expect(formatQuotePrice(184.235)).toBe("$184.24");
    expect(formatQuotePrice(4_812.52)).toBe("$4,813");
    expect(formatQuotePrice(undefined)).toBe("—");
  });

  it("allows approved remote image hosts", () => {
    const imageUrl = "https://s.yimg.com/os/creatr-uploaded-images/example.jpg";
    expect(getSafeRemoteImageUrl(imageUrl, fallbackUrl)).toBe(imageUrl);
  });

  it("falls back for unapproved or invalid image URLs", () => {
    expect(getSafeRemoteImageUrl("https://example.com/image.jpg", fallbackUrl)).toBe(
      fallbackUrl
    );
    expect(getSafeRemoteImageUrl("not-a-url", fallbackUrl)).toBe(fallbackUrl);
  });

  it("uses pre-market prices while the quote is in pre-market", () => {
    expect(
      selectQuoteSnapshot({
        marketState: "PRE",
        regularMarketPrice: 100,
        regularMarketChangePercent: 1,
        regularMarketTime: 1_800_000_000,
        preMarketPrice: 105,
        preMarketChange: 5,
        preMarketChangePercent: 5,
        preMarketTime: 1_800_003_000,
      })
    ).toEqual({
      price: 105,
      change: 5,
      changePercent: 5,
      updatedAt: "2027-01-15T08:50:00.000Z",
    });
  });

  it("uses post-market prices while the quote is in post-market", () => {
    expect(
      selectQuoteSnapshot({
        marketState: "POST",
        regularMarketPrice: 100,
        regularMarketChange: 1,
        regularMarketChangePercent: 1,
        regularMarketTime: 1_800_000_000,
        postMarketPrice: 98,
        postMarketChange: -2,
        postMarketChangePercent: -2,
        postMarketTime: 1_800_004_800,
      })
    ).toEqual({
      price: 98,
      change: -2,
      changePercent: -2,
      updatedAt: "2027-01-15T09:20:00.000Z",
    });
  });

  it("uses regular-market prices during regular sessions", () => {
    expect(
      selectQuoteSnapshot({
        marketState: "REGULAR",
        regularMarketPrice: 101,
        regularMarketChange: 1,
        regularMarketChangePercent: 1,
        regularMarketTime: 1_800_000_000,
        postMarketPrice: 98,
        postMarketChange: -2,
        postMarketChangePercent: -2,
        postMarketTime: 1_800_004_800,
      })
    ).toEqual({
      price: 101,
      change: 1,
      changePercent: 1,
      updatedAt: "2027-01-15T08:00:00.000Z",
    });
  });
});
