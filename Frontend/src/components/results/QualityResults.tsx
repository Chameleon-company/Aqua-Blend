import { StatusPill } from "@/components/ui/StatusPill";
import { RangeBar } from "@/components/ui/RangeBar";
import { formatAlkalinity, formatNtu, formatPh, formatUnit, MISSING_VALUE } from "@/utils/formatters";
import type { QualityResult } from "@/types/milp-results";

function formatValue(result: QualityResult): string {
  switch (result.parameterId) {
    case "pH":
      return formatPh(result.blendedValue);
    case "turbidity":
      return formatNtu(result.blendedValue);
    case "alkalinity":
      return formatAlkalinity(result.blendedValue);
    default:
      return formatUnit(result.blendedValue, result.unit);
  }
}

function formatLimit(value: number | undefined, result: QualityResult): string {
  if (value === undefined) return MISSING_VALUE;
  const withUnit: QualityResult = { ...result, blendedValue: value };
  return formatValue(withUnit);
}

/** layout.md §12 — blend at plant inflow only; no post-treatment implication. */
export function QualityResults({ results }: { results: QualityResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-ink-muted">No water-quality results are available for this solution.</p>;
  }

  const byPlant = new Map<string, QualityResult[]>();
  for (const result of results) {
    const list = byPlant.get(result.plantId) ?? [];
    list.push(result);
    byPlant.set(result.plantId, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-ink-faint">Values reflect blend at plant inflow, not post-treatment water quality.</p>
      {Array.from(byPlant.entries()).map(([plantId, rows]) => (
        <div key={plantId}>
          <h3 className="text-sm font-semibold text-ink mb-3 font-mono">{plantId}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.parameterId} className="border border-border rounded-sm p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink capitalize">{row.parameterId}</p>
                  {row.isBinding !== undefined ? (
                    <StatusPill label={row.isBinding ? "Binding" : "Within limits"} tone={row.isBinding ? "warning" : "success"} />
                  ) : null}
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{formatValue(row)}</p>
                <div className="mt-3">
                  <RangeBar value={row.blendedValue} lowerLimit={row.lowerLimit} upperLimit={row.upperLimit} isBinding={row.isBinding} />
                </div>
                <dl className="mt-2 flex justify-between text-xs text-ink-muted">
                  <div>
                    <dt className="inline">Lower: </dt>
                    <dd className="inline">{formatLimit(row.lowerLimit, row)}</dd>
                  </div>
                  <div>
                    <dt className="inline">Upper: </dt>
                    <dd className="inline">{formatLimit(row.upperLimit, row)}</dd>
                  </div>
                </dl>
                <dl className="mt-1 flex justify-between text-xs text-ink-faint">
                  <div>
                    <dt className="inline">Lower margin: </dt>
                    <dd className="inline">{row.lowerMargin !== undefined ? formatLimit(row.lowerMargin, row) : MISSING_VALUE}</dd>
                  </div>
                  <div>
                    <dt className="inline">Upper margin: </dt>
                    <dd className="inline">{row.upperMargin !== undefined ? formatLimit(row.upperMargin, row) : MISSING_VALUE}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
