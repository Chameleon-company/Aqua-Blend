import { Field } from "@/components/ui/Field";
import type { DemandZoneRef } from "@/types/reference-data";
import type { ScenarioDemandSelection } from "@/types/scenario";

export interface DemandZoneEditorProps {
  zones: ScenarioDemandSelection[];
  demandZoneRefs: DemandZoneRef[];
  onChange: (next: ScenarioDemandSelection[]) => void;
}

export function DemandZoneEditor({ zones, demandZoneRefs, onChange }: DemandZoneEditorProps) {
  function update(zoneId: string, demandMlPerDay: number | null) {
    onChange(zones.map((z) => (z.zoneId === zoneId ? { ...z, demandMlPerDay } : z)));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {demandZoneRefs.map((ref) => {
        const zone = zones.find((z) => z.zoneId === ref.zoneId);
        const invalid = zone && zone.demandMlPerDay !== null && zone.demandMlPerDay !== undefined && zone.demandMlPerDay <= 0;
        return (
          <Field
            key={ref.zoneId}
            id={`demand-${ref.zoneId}`}
            label={ref.name}
            error={invalid ? "Demand must be greater than zero." : undefined}
          >
            <div className="flex items-center gap-2">
              <input
                id={`demand-${ref.zoneId}`}
                type="number"
                min={0}
                step="0.1"
                value={zone?.demandMlPerDay ?? ""}
                onChange={(e) => update(ref.zoneId, e.target.value === "" ? null : Number(e.target.value))}
                className="w-full rounded-sm border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary"
                placeholder="0.00"
              />
              <span className="text-xs text-ink-faint whitespace-nowrap">ML/day</span>
            </div>
          </Field>
        );
      })}
    </div>
  );
}
