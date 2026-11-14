import { StatusPill } from "@/components/ui/StatusPill";
import { DemandBar } from "@/components/ui/DemandBar";
import { formatMlPerDay, MISSING_VALUE } from "@/utils/formatters";
import type { DemandFulfilment } from "@/types/milp-results";

export function DemandResults({ zones }: { zones: DemandFulfilment[] }) {
  if (zones.length === 0) {
    return <p className="text-sm text-ink-muted">No demand-zone results are available for this solution.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {zones.map((zone) => (
        <div key={zone.zoneId} className="border border-border rounded-sm p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-ink">{zone.zoneName ?? zone.zoneId}</p>
              {zone.zoneName ? <p className="font-mono text-xs text-ink-faint">{zone.zoneId}</p> : null}
            </div>
            {zone.demandSatisfied !== undefined ? (
              <StatusPill
                label={zone.demandSatisfied ? "Satisfied" : "Unmet"}
                tone={zone.demandSatisfied ? "success" : "warning"}
              />
            ) : null}
          </div>

          <dl className="mt-3 flex justify-between text-sm">
            <div>
              <dt className="text-ink-faint">Demand</dt>
              <dd className="font-medium text-ink">{formatMlPerDay(zone.demandMlPerDay)}</dd>
            </div>
            <div className="text-right">
              <dt className="text-ink-faint">Delivered</dt>
              <dd className="font-medium text-ink">{formatMlPerDay(zone.deliveredMlPerDay)}</dd>
            </div>
          </dl>

          <div className="mt-2">
            <DemandBar demand={zone.demandMlPerDay} delivered={zone.deliveredMlPerDay} />
          </div>

          <dl className="mt-3 flex justify-between text-xs text-ink-muted">
            <div>
              <dt className="inline">Unmet: </dt>
              <dd className="inline">{zone.unmetDemandMlPerDay !== undefined ? formatMlPerDay(zone.unmetDemandMlPerDay) : MISSING_VALUE}</dd>
            </div>
            <div>
              <dt className="inline">Surplus: </dt>
              <dd className="inline">{zone.surplusMlPerDay !== undefined ? formatMlPerDay(zone.surplusMlPerDay) : MISSING_VALUE}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
