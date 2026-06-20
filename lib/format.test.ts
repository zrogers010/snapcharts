import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatLargeNumber,
  formatNumber,
  formatPercent,
} from "./format";

describe("format helpers", () => {
  it("formats missing values as em dashes", () => {
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatLargeNumber(null)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });

  it("formats market-sized numbers compactly", () => {
    expect(formatLargeNumber(1_250)).toBe("1.3K");
    expect(formatLargeNumber(25_000_000)).toBe("25.00M");
    expect(formatLargeNumber(3_100_000_000)).toBe("3.10B");
  });

  it("formats percentages from decimal values", () => {
    expect(formatPercent(0.1234)).toBe("12.34%");
  });
});

