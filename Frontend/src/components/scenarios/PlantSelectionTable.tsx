import { formatMlPerDay, MISSING_VALUE } from "@/utils/formatters";
import type { PlantRef } from "@/types/reference-data";
import type { ScenarioPlantSelection } from "@/types/scenario";

export interface PlantSelectionTableProps {
  selections: ScenarioPlantSelection[];
  plantRefs: PlantRef[];
  onChange: (next: ScenarioPlantSelection[]) => void;
}

/** The MILP decides actual throughput — this only controls whether a plant is available and its optional capacity override. */
export function PlantSelectionTable({ selections, plantRefs, onChange }: PlantSelectionTableProps) {
  function update(plantId: string, patch: Partial<ScenarioPlantSelection>) {
    onChange(selections.map((p) => (p.plantId === plantId ? { ...p, ...patch } : p)));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">Treatment plant selection for this scenario</caption>
        <thead>
          <tr className="border-b border-border-strong text-left">
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Use</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Plant Name</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted text-right">Default Min Capacity</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted text-right">Default Max Capacity</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Optional Override</th>
          </tr>
        </thead>
        <tbody>
          {plantRefs.map((ref) => {
            const sel = selections.find((p) => p.plantId === ref.plantId);
            if (!sel) return null;
            return (
              <tr key={ref.plantId} className="border-b border-border">
                <td className="py-2 px-3">
                  <input
                    type="checkbox"
                    checked={sel.enabled}
                    onChange={(e) => update(ref.plantId, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded-sm border-border-strong accent-primary"
                    aria-label={`Use ${ref.name}`}
                  />
                </td>
                <td className="py-2 px-3">
                  <div className="font-medium text-ink">{ref.name}</div>
                  <div className="font-mono text-xs text-ink-faint">{ref.plantId}</div>
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {ref.defaultMinCapacityMlPerDay !== undefined ? formatMlPerDay(ref.defaultMinCapacityMlPerDay) : MISSING_VALUE}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {ref.defaultMaxCapacityMlPerDay !== undefined ? formatMlPerDay(ref.defaultMaxCapacityMlPerDay) : MISSING_VALUE}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min override"
                      value={sel.minCapacityOverrideMlPerDay ?? ""}
                      onChange={(e) => update(ref.plantId, { minCapacityOverrideMlPerDay: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="w-24 rounded-sm border border-border-strong bg-surface px-2 py-1 text-xs text-ink"
                      aria-label={`Minimum capacity override for ${ref.name}`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Max override"
                      value={sel.maxCapacityOverrideMlPerDay ?? ""}
                      onChange={(e) => update(ref.plantId, { maxCapacityOverrideMlPerDay: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="w-24 rounded-sm border border-border-strong bg-surface px-2 py-1 text-xs text-ink"
                      aria-label={`Maximum capacity override for ${ref.name}`}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
