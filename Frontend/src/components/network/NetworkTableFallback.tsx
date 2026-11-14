import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import type { PlantZoneFlow, SourcePlantFlow } from "@/types/milp-results";

/**
 * Always-rendered accessible equivalent of NetworkGraph — layout.md §10.4 /
 * §21 requires a text/table alternative, not just a hidden fallback.
 */
export function NetworkTableFallback({
  sourceToPlantFlows,
  plantToZoneFlows,
}: {
  sourceToPlantFlows: SourcePlantFlow[];
  plantToZoneFlows: PlantZoneFlow[];
}) {
  const spColumns: Column<SourcePlantFlow>[] = [
    { key: "source", header: "Source", sortValue: (f) => f.sourceId, render: (f) => <span className="font-mono">{f.sourceId}</span> },
    { key: "plant", header: "Plant", sortValue: (f) => f.plantId, render: (f) => <span className="font-mono">{f.plantId}</span> },
    { key: "status", header: "Status", render: (f) => <StatusPill label={f.isActive ? "Active" : "Inactive"} tone={f.isActive ? "success" : "neutral"} /> },
    { key: "flow", header: "Flow", align: "right", sortValue: (f) => f.flowMlPerDay, render: (f) => formatMlPerDay(f.flowMlPerDay) },
    { key: "utilisation", header: "Utilisation", align: "right", sortValue: (f) => f.utilisationPercent ?? null, render: (f) => (f.utilisationPercent !== undefined ? formatPercent(f.utilisationPercent) : MISSING_VALUE) },
  ];

  const pzColumns: Column<PlantZoneFlow>[] = [
    { key: "plant", header: "Plant", sortValue: (f) => f.plantId, render: (f) => <span className="font-mono">{f.plantId}</span> },
    { key: "zone", header: "Zone", sortValue: (f) => f.zoneId, render: (f) => <span className="font-mono">{f.zoneId}</span> },
    { key: "status", header: "Status", render: (f) => <StatusPill label={f.isActive ? "Active" : "Inactive"} tone={f.isActive ? "success" : "neutral"} /> },
    { key: "flow", header: "Flow", align: "right", sortValue: (f) => f.flowMlPerDay, render: (f) => formatMlPerDay(f.flowMlPerDay) },
    { key: "utilisation", header: "Utilisation", align: "right", sortValue: (f) => f.utilisationPercent ?? null, render: (f) => (f.utilisationPercent !== undefined ? formatPercent(f.utilisationPercent) : MISSING_VALUE) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Source → Plant flows</h3>
        <SortableTable caption="Flows from sources to treatment plants" columns={spColumns} rows={sourceToPlantFlows} getRowKey={(f) => `${f.sourceId}-${f.plantId}`} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Plant → Zone flows</h3>
        <SortableTable caption="Flows from treatment plants to demand zones" columns={pzColumns} rows={plantToZoneFlows} getRowKey={(f) => `${f.plantId}-${f.zoneId}`} />
      </div>
    </div>
  );
}
