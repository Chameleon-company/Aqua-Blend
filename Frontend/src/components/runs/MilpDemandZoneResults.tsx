import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { DemandBar } from "@/components/ui/DemandBar";
import { formatMlPerDay, MISSING_VALUE } from "@/utils/formatters";
import { asArray, asRecord, pickBoolean, pickNumber, pickString } from "@/utils/jsonAccess";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpDemandZoneResultsProps {
  output: MilpModelOutputDto;
}

/** Demand Fulfilment (AquaBlend_Frontend_Final_Integration_Implementation.md §13/§17). */
export function MilpDemandZoneResults({ output }: MilpDemandZoneResultsProps) {
  const zones = asArray(output.demandZones).map(asRecord);

  return (
    <Card>
      <CardHeader title="Demand Fulfilment" />
      {zones.length === 0 ? (
        <p className="text-sm text-ink-muted">No demand-zone results are available for this run yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone, index) => {
            const zoneId = pickString(zone, "zone_id", "zoneId") ?? `zone-${index}`;
            const name = pickString(zone, "zone_name", "zoneName");
            const demand = pickNumber(zone, "demand_ml_per_day");
            const delivered = pickNumber(zone, "delivered_ml_per_day");
            const unmet = pickNumber(zone, "unmet_demand_ml_per_day");
            const surplus = pickNumber(zone, "surplus_ml_per_day");
            const satisfied = pickBoolean(zone, "demand_satisfied");

            return (
              <div key={zoneId} className="border border-border rounded-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{name ?? zoneId}</p>
                    {name ? <p className="font-mono text-xs text-ink-faint">{zoneId}</p> : null}
                  </div>
                  {satisfied !== null ? (
                    <StatusPill label={satisfied ? "Satisfied" : "Unmet"} tone={satisfied ? "success" : "warning"} />
                  ) : null}
                </div>

                <dl className="mt-3 flex justify-between text-sm">
                  <div>
                    <dt className="text-ink-faint">Demand</dt>
                    <dd className="font-medium text-ink">{formatMlPerDay(demand)}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-ink-faint">Delivered</dt>
                    <dd className="font-medium text-ink">{formatMlPerDay(delivered)}</dd>
                  </div>
                </dl>

                {demand !== null && delivered !== null ? (
                  <div className="mt-2">
                    <DemandBar demand={demand} delivered={delivered} />
                  </div>
                ) : null}

                <dl className="mt-3 flex justify-between text-xs text-ink-muted">
                  <div>
                    <dt className="inline">Unmet: </dt>
                    <dd className="inline">{unmet !== null ? formatMlPerDay(unmet) : MISSING_VALUE}</dd>
                  </div>
                  <div>
                    <dt className="inline">Surplus: </dt>
                    <dd className="inline">{surplus !== null ? formatMlPerDay(surplus) : MISSING_VALUE}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
