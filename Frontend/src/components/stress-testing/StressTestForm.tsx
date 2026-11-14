"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { MilpResultViewModel } from "@/types/milp-results";
import type { StressTestConfig, StressTestKind } from "@/types/stress-test";

export interface StressTestFormProps {
  result: MilpResultViewModel;
  submitting: boolean;
  onSubmit: (config: StressTestConfig) => void;
}

const KIND_LABELS: Record<StressTestKind, string> = {
  increase_demand: "Increase demand",
  reduce_plant_capacity: "Reduce plant capacity",
  disable_source: "Disable source",
  reduce_link_capacity: "Reduce link capacity",
  stricter_quality_limits: "Stricter water-quality limits",
};

/** The frontend only configures a controlled test against an already-completed run; the backend executes it. */
export function StressTestForm({ result, submitting, onSubmit }: StressTestFormProps) {
  const [kind, setKind] = useState<StressTestKind>("increase_demand");
  const [targetId, setTargetId] = useState("");
  const [variationPercent, setVariationPercent] = useState(15);

  const needsTarget = kind !== "stricter_quality_limits";
  const targetOptions =
    kind === "increase_demand"
      ? result.demandZones.map((z) => ({ id: z.zoneId, label: z.zoneName ?? z.zoneId }))
      : kind === "disable_source"
        ? result.selectedSources.map((s) => ({ id: s.sourceId, label: s.sourceName ?? s.sourceId }))
        : kind === "reduce_plant_capacity"
          ? result.plants.map((p) => ({ id: p.plantId, label: p.plantName ?? p.plantId }))
          : kind === "reduce_link_capacity"
            ? [
                ...result.sourceToPlantFlows.map((f) => ({ id: `${f.sourceId}->${f.plantId}`, label: `${f.sourceId} → ${f.plantId}` })),
                ...result.plantToZoneFlows.map((f) => ({ id: `${f.plantId}->${f.zoneId}`, label: `${f.plantId} → ${f.zoneId}` })),
              ]
            : [];

  function handleSubmit() {
    const config: StressTestConfig = {
      kind,
      targetId: needsTarget ? targetId || undefined : undefined,
      variationPercent: kind === "disable_source" ? undefined : variationPercent,
    };
    onSubmit(config);
  }

  const disabled = submitting || (needsTarget && targetOptions.length > 0 && !targetId);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-56">
        <Field id="stress-kind" label="Test">
          <Select
            id="stress-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as StressTestKind);
              setTargetId("");
            }}
          >
            {(Object.keys(KIND_LABELS) as StressTestKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {needsTarget ? (
        <div className="w-56">
          <Field id="stress-target" label="Target">
            <Select id="stress-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="" disabled>
                Select a target
              </option>
              {targetOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      {kind !== "disable_source" ? (
        <div className="w-40">
          <Field id="stress-variation" label="Variation (%)">
            <input
              id="stress-variation"
              type="number"
              min={1}
              max={100}
              value={variationPercent}
              onChange={(e) => setVariationPercent(Number(e.target.value))}
              className="w-full rounded-sm border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary"
            />
          </Field>
        </div>
      ) : null}

      <Button onClick={handleSubmit} disabled={disabled}>
        {submitting ? "Running…" : "Run Stress Test"}
      </Button>
    </div>
  );
}
