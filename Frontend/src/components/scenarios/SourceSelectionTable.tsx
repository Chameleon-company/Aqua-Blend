import { StatusPill } from "@/components/ui/StatusPill";
import { formatMlPerDay, MISSING_VALUE } from "@/utils/formatters";
import type { SourceRef } from "@/types/reference-data";
import type { ScenarioSourceSelection } from "@/types/scenario";

export interface SourceSelectionTableProps {
  selections: ScenarioSourceSelection[];
  sourceRefs: SourceRef[];
  onChange: (next: ScenarioSourceSelection[]) => void;
}

/**
 * User controls: enabled, forced_inactive, optional min/max withdrawal
 * override. Cost, quality, provenance, and model-readiness are backend/
 * Supabase-owned reference data — display only, never user-entered here.
 */
export function SourceSelectionTable({ selections, sourceRefs, onChange }: SourceSelectionTableProps) {
  function update(sourceId: string, patch: Partial<ScenarioSourceSelection>) {
    onChange(selections.map((s) => (s.sourceId === sourceId ? { ...s, ...patch } : s)));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">Source selection for this scenario</caption>
        <thead>
          <tr className="border-b border-border-strong text-left">
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Use</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Source Name</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Type</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Availability</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted text-right">Default Max Withdrawal</th>
            <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Scenario Override</th>
          </tr>
        </thead>
        <tbody>
          {sourceRefs.map((ref) => {
            const sel = selections.find((s) => s.sourceId === ref.sourceId);
            if (!sel) return null;
            return (
              <tr key={ref.sourceId} className="border-b border-border">
                <td className="py-2 px-3">
                  <input
                    type="checkbox"
                    checked={sel.enabled}
                    onChange={(e) => update(ref.sourceId, { enabled: e.target.checked, forcedInactive: e.target.checked ? sel.forcedInactive : false })}
                    className="h-4 w-4 rounded-sm border-border-strong accent-primary"
                    aria-label={`Use ${ref.name}`}
                  />
                </td>
                <td className="py-2 px-3">
                  <div className="font-medium text-ink">{ref.name}</div>
                  <div className="font-mono text-xs text-ink-faint">{ref.sourceId}</div>
                  {ref.modelReady === false ? <StatusPill className="mt-1" label="Not model-ready" tone="warning" /> : null}
                </td>
                <td className="py-2 px-3">{ref.sourceType ?? MISSING_VALUE}</td>
                <td className="py-2 px-3">{ref.availabilityStatus ?? MISSING_VALUE}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {ref.defaultMaxWithdrawalMlPerDay !== undefined ? formatMlPerDay(ref.defaultMaxWithdrawalMlPerDay) : MISSING_VALUE}
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <input
                        type="checkbox"
                        checked={sel.forcedInactive ?? false}
                        disabled={!sel.enabled}
                        onChange={(e) => update(ref.sourceId, { forcedInactive: e.target.checked })}
                        className="h-3.5 w-3.5 rounded-sm border-border-strong accent-primary"
                      />
                      Force inactive
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Min override"
                      value={sel.minWithdrawalOverrideMlPerDay ?? ""}
                      onChange={(e) => update(ref.sourceId, { minWithdrawalOverrideMlPerDay: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="w-24 rounded-sm border border-border-strong bg-surface px-2 py-1 text-xs text-ink"
                      aria-label={`Minimum withdrawal override for ${ref.name}`}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Max override"
                      value={sel.maxWithdrawalOverrideMlPerDay ?? ""}
                      onChange={(e) => update(ref.sourceId, { maxWithdrawalOverrideMlPerDay: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="w-24 rounded-sm border border-border-strong bg-surface px-2 py-1 text-xs text-ink"
                      aria-label={`Maximum withdrawal override for ${ref.name}`}
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
