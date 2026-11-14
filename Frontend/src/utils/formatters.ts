/**
 * Formatting standards — layout.md §18.
 *
 * Never coerce a missing value to 0 — callers pass `null | undefined` through
 * and these return the MISSING_VALUE placeholder, which components render
 * with an explicit "not available" marker rather than a bare dash.
 */

export const MISSING_VALUE = "N/A";

/** Single swappable point for the project-configured currency (layout.md §18). */
const CURRENCY_CODE = "AUD";
const CURRENCY_LOCALE = "en-AU";

type Num = number | null | undefined;

export function isPresent(value: Num): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: Num, decimals = 2): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return roundTo(value, decimals).toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** ratio is 0-1 (e.g. 0.5833333333333334 -> "58.3%") */
export function formatPercent(ratio: Num, decimals = 1): string {
  if (!isPresent(ratio)) return MISSING_VALUE;
  return `${roundTo(ratio * 100, decimals).toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatCurrency(value: Num): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMlPerDay(value: Num, decimals = 2): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return `${formatNumber(value, decimals)} ML/day`;
}

export function formatNtu(value: Num, decimals = 2): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return `${formatNumber(value, decimals)} NTU`;
}

export function formatAlkalinity(value: Num, decimals = 2): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return `${formatNumber(value, decimals)} mg/L CaCO₃`;
}

export function formatPh(value: Num, decimals = 2): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return formatNumber(value, decimals);
}

export function formatUnit(value: Num, unit: string, decimals = 2): string {
  if (!isPresent(value)) return MISSING_VALUE;
  return `${formatNumber(value, decimals)} ${unit}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return MISSING_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING_VALUE;
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatSolveTime(ms: Num): string {
  if (!isPresent(ms)) return MISSING_VALUE;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${roundTo(ms / 1000, 2)} s`;
}

/** Alias for formatSolveTime under the generic name used elsewhere (e.g. solve time, AI latency). */
export const formatDurationMs = formatSolveTime;
