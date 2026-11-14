import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { RangeBar } from "@/components/ui/RangeBar";
import { formatNumber, formatUnit, MISSING_VALUE } from "@/utils/formatters";
import { asArray, asRecord, pick, pickBoolean, pickNumber, pickString } from "@/utils/jsonAccess";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpQualityResultsProps {
  output: MilpModelOutputDto;
}

export interface QualityRow {
  key: string;
  plantId: string;
  parameterId: string;
  unit: string | null;
  value: number | null;
  lowerLimit: number | null;
  upperLimit: number | null;
  /** True/false only when the contract explicitly reports it — see §19: never inferred. */
  withinLimits: boolean | null;
  isBinding: boolean | null;
}

/**
 * The real MILP output contract nests quality under
 * `{ plant_inflow: [{ plant_id, parameters: [...] }] }`; the mock (and any
 * older flattened shape) instead returns a flat array of rows. Both are
 * normalised to the same row shape here.
 */
/** Exported for reuse by AiStatusStrip.tsx's quality-violation tile — same source data, no re-derivation. */
export function normalizeQuality(raw: unknown): QualityRow[] {
  const record = asRecord(raw);
  const plantInflow = asArray(pick(record, "plant_inflow", "plantInflow"));

  if (plantInflow.length > 0) {
    return plantInflow.flatMap((plantEntry, plantIndex) => {
      const plant = asRecord(plantEntry);
      const plantId = pickString(plant, "plant_id", "plantId") ?? `plant-${plantIndex}`;
      const parameters = asArray(pick(plant, "parameters"));
      return parameters.map((paramRaw, paramIndex) => {
        const param = asRecord(paramRaw);
        return {
          key: `${plantId}-${paramIndex}`,
          plantId,
          parameterId: pickString(param, "parameter_id", "parameterId") ?? `parameter-${paramIndex}`,
          unit: pickString(param, "reported_unit", "model_unit", "unit"),
          value: pickNumber(param, "reported_value", "model_value"),
          lowerLimit: pickNumber(param, "model_min", "lower_limit"),
          upperLimit: pickNumber(param, "model_max", "upper_limit"),
          withinLimits: pickBoolean(param, "within_limits"),
          isBinding: pickBoolean(param, "binding_lower") || pickBoolean(param, "binding_upper"),
        };
      });
    });
  }

  return asArray(raw).map((rowRaw, index) => {
    const row = asRecord(rowRaw);
    return {
      key: `${pickString(row, "plant_id", "plantId") ?? "plant"}-${index}`,
      plantId: pickString(row, "plant_id", "plantId") ?? `plant-${index}`,
      parameterId: pickString(row, "parameter_id", "parameterId") ?? `parameter-${index}`,
      unit: pickString(row, "unit"),
      value: pickNumber(row, "blended_value", "value"),
      lowerLimit: pickNumber(row, "lower_limit"),
      upperLimit: pickNumber(row, "upper_limit"),
      withinLimits: null,
      isBinding: pickBoolean(row, "is_binding"),
    };
  });
}

/**
 * Water Quality (AquaBlend_Frontend_Final_Integration_Implementation.md
 * §13/§19) — within/near/violation states are only shown when the contract
 * actually reports them; otherwise no status pill is rendered at all.
 */
export function MilpQualityResults({ output }: MilpQualityResultsProps) {
  const rows = normalizeQuality(output.quality);

  const byPlant = new Map<string, QualityRow[]>();
  for (const row of rows) {
    const list = byPlant.get(row.plantId) ?? [];
    list.push(row);
    byPlant.set(row.plantId, list);
  }

  return (
    <Card>
      <CardHeader title="Water Quality" description="Values reflect blend at plant inflow, not post-treatment water quality." />
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No water-quality results are available for this run yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(byPlant.entries()).map(([plantId, plantRows]) => (
            <div key={plantId}>
              <h3 className="text-sm font-semibold text-ink mb-3 font-mono">{plantId}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plantRows.map((row) => (
                  <div key={row.key} className="border border-border rounded-sm p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink capitalize">{row.parameterId}</p>
                      {row.withinLimits !== null ? (
                        <StatusPill label={row.withinLimits ? "Within limits" : "Limit violated"} tone={row.withinLimits ? "success" : "danger"} />
                      ) : row.isBinding !== null ? (
                        <StatusPill label={row.isBinding ? "Binding" : "Within limits"} tone={row.isBinding ? "warning" : "success"} />
                      ) : null}
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
                      {row.value !== null ? (row.unit ? formatUnit(row.value, row.unit) : formatNumber(row.value)) : MISSING_VALUE}
                    </p>
                    {row.value !== null && row.lowerLimit !== null && row.upperLimit !== null ? (
                      <div className="mt-3">
                        <RangeBar value={row.value} lowerLimit={row.lowerLimit} upperLimit={row.upperLimit} isBinding={row.isBinding ?? undefined} />
                      </div>
                    ) : null}
                    <dl className="mt-2 flex justify-between text-xs text-ink-muted">
                      <div>
                        <dt className="inline">Lower: </dt>
                        <dd className="inline">{row.lowerLimit !== null ? formatNumber(row.lowerLimit) : MISSING_VALUE}</dd>
                      </div>
                      <div>
                        <dt className="inline">Upper: </dt>
                        <dd className="inline">{row.upperLimit !== null ? formatNumber(row.upperLimit) : MISSING_VALUE}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
