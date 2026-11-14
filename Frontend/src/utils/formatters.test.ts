import { describe, expect, it } from "vitest";
import {
  formatAlkalinity,
  formatCurrency,
  formatMlPerDay,
  formatNtu,
  formatNumber,
  formatPercent,
  formatPh,
  MISSING_VALUE,
} from "./formatters";

describe("formatPercent", () => {
  it("converts a 0-1 ratio to a rounded percentage (layout.md §18 example)", () => {
    expect(formatPercent(0.5833333333333334)).toBe("58.3%");
  });

  it("returns the missing-value marker instead of 0 for null/undefined", () => {
    expect(formatPercent(null)).toBe(MISSING_VALUE);
    expect(formatPercent(undefined)).toBe(MISSING_VALUE);
  });
});

describe("formatPh", () => {
  it("rounds to two decimals (layout.md §18 example)", () => {
    expect(formatPh(7.093586014879103)).toBe("7.09");
  });
});

describe("formatNumber", () => {
  it("rounds to two decimals by default (layout.md §18 example)", () => {
    expect(formatNumber(47.916666666666664)).toBe("47.92");
  });

  it("never renders a fabricated zero for missing data", () => {
    expect(formatNumber(undefined)).toBe(MISSING_VALUE);
    expect(formatNumber(null)).toBe(MISSING_VALUE);
  });
});

describe("unit formatters", () => {
  it("appends the correct unit suffix", () => {
    expect(formatMlPerDay(12.5)).toBe("12.50 ML/day");
    expect(formatNtu(3.1)).toBe("3.10 NTU");
    expect(formatAlkalinity(148)).toBe("148.00 mg/L CaCO₃");
  });
});

describe("formatCurrency", () => {
  it("formats a currency value", () => {
    expect(formatCurrency(34344)).toMatch(/34,344\.00/);
  });

  it("does not treat missing values as zero", () => {
    expect(formatCurrency(undefined)).toBe(MISSING_VALUE);
  });
});
