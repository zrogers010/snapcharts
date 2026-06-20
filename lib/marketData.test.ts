import { describe, expect, it } from "vitest";
import { formatQuotePrice, getSafeRemoteImageUrl } from "./marketData";

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
});

