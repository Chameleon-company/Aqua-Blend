import clsx from "clsx";
import { formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import { StatusPill } from "@/components/ui/StatusPill";
import type { PlantUtilisation } from "@/types/milp-results";

const NEAR_CAPACITY_THRESHOLD = 0.9;

/** Which plant is closest to capacity? Near-capacity plants get an explicit warning tone, not just a longer bar. */
export function PlantUtilisationBars({ plants }: { plants: PlantUtilisation[] }) {
  const active = plants.filter((p) => p.isActive);
  if (active.length === 0) return null;

  const sorted = [...active].sort((a, b) => (b.utilisationPercent ?? 0) - (a.utilisationPercent ?? 0));

  return (
    <ul className="flex flex-col gap-4">
      {sorted.map((plant) => {
        const pct = plant.utilisationPercent;
        const clamped = pct !== undefined ? Math.min(100, Math.max(0, pct * 100)) : 0;
        const nearCapacity = pct !== undefined && pct >= NEAR_CAPACITY_THRESHOLD;
        return (
          <li key={plant.plantId}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <span className="font-medium text-ink truncate">{plant.plantName ?? plant.plantId}</span>
                {plant.plantName ? <span className="ml-1.5 font-mono text-xs text-ink-faint">{plant.plantId}</span> : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {nearCapacity ? <StatusPill label="Near capacity" tone="warning" /> : null}
                <span className="text-sm font-medium tabular-nums text-ink">{pct !== undefined ? formatPercent(pct) : MISSING_VALUE}</span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface-sunken overflow-hidden" aria-hidden="true">
              <div
                className={clsx("h-full rounded-full transition-[width]", nearCapacity ? "bg-warning" : "bg-primary")}
                style={{ width: `${clamped}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-ink-faint">
              <span>{formatMlPerDay(plant.throughputMlPerDay)}</span>
              <span>{plant.maxThroughputMlPerDay !== undefined ? `of ${formatMlPerDay(plant.maxThroughputMlPerDay)} max` : MISSING_VALUE}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
