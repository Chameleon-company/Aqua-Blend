/**
 * Defensive readers for the genuinely dynamic JSON the backend returns inside
 * MilpModelOutputDto/MilpModelInputDto/MilpAiOutputDto (raw solver/canonical
 * documents, typed `unknown` in src/types/run.ts). Never assume a key exists
 * or that a value is the expected type — every reader here degrades to
 * `null`/`[]` instead of throwing, per AquaBlend_Frontend_Final_Integration_
 * Implementation.md §17/§20 ("Do not assume every nested property always
 * exists").
 *
 * Several fields accept more than one candidate key: the real backend's MILP
 * output contract (MILP/json_contracts/output_contract_v1.json) and the
 * frontend's own mock fixtures don't always use the same field name for the
 * same concept (e.g. `activated` vs `is_active`) — checking both keeps this
 * frontend resilient to that drift instead of only working against one data
 * source.
 */

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

export function pickString(record: Record<string, unknown>, ...keys: string[]): string | null {
  const value = pick(record, ...keys);
  return typeof value === "string" ? value : null;
}

export function pickNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  const value = pick(record, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function pickBoolean(record: Record<string, unknown>, ...keys: string[]): boolean | null {
  const value = pick(record, ...keys);
  return typeof value === "boolean" ? value : null;
}

export function pickStringArray(record: Record<string, unknown>, ...keys: string[]): string[] {
  const value = pick(record, ...keys);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
