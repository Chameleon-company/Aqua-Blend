import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import { asArray, asRecord, pickBoolean, pickNumber, pickString } from "@/utils/jsonAccess";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpFlowResultsProps {
  output: MilpModelOutputDto;
}

interface FlowRow {
  key: string;
  from: string;
  to: string;
  active: boolean | null;
  flow: number | null;
  utilisation: number | null;
}

function toFlowRow(raw: unknown, index: number, fromKey: string[], toKey: string[]): FlowRow {
  const r = asRecord(raw);
  return {
    key: `${pickString(r, ...fromKey) ?? index}-${pickString(r, ...toKey) ?? index}`,
    from: pickString(r, ...fromKey) ?? MISSING_VALUE,
    to: pickString(r, ...toKey) ?? MISSING_VALUE,
    active: pickBoolean(r, "activated", "is_active"),
    flow: pickNumber(r, "flow_ml_per_day"),
    utilisation: pickNumber(r, "utilisation_percent"),
  };
}

function flowColumns(fromLabel: string, toLabel: string): Column<FlowRow>[] {
  return [
    { key: "from", header: fromLabel, sortValue: (f) => f.from, render: (f) => <span className="font-mono text-xs">{f.from}</span> },
    { key: "to", header: toLabel, sortValue: (f) => f.to, render: (f) => <span className="font-mono text-xs">{f.to}</span> },
    {
      key: "active",
      header: "Active",
      render: (f) => (f.active === null ? MISSING_VALUE : <StatusPill label={f.active ? "Active" : "Inactive"} tone={f.active ? "success" : "neutral"} />),
    },
    { key: "flow", header: "Flow", align: "right", sortValue: (f) => f.flow, render: (f) => formatMlPerDay(f.flow) },
    { key: "utilisation", header: "Utilisation", align: "right", sortValue: (f) => f.utilisation, render: (f) => (f.utilisation !== null ? formatPercent(f.utilisation) : MISSING_VALUE) },
  ];
}

/** Source -> Plant and Plant -> Zone Flows (AquaBlend_Frontend_Final_Integration_Implementation.md §13/§18). */
export function MilpFlowResults({ output }: MilpFlowResultsProps) {
  const sourceToPlant = asArray(output.flowsSourceToPlant).map((r, i) => toFlowRow(r, i, ["source_id", "sourceId"], ["plant_id", "plantId"]));
  const plantToZone = asArray(output.flowsPlantToZone).map((r, i) => toFlowRow(r, i, ["plant_id", "plantId"], ["zone_id", "zoneId"]));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Source → Plant Flows" />
        <SortableTable
          caption="Flow from each water source to the treatment plant it feeds"
          columns={flowColumns("Source", "Plant")}
          rows={sourceToPlant}
          getRowKey={(f) => f.key}
          emptyMessage="No source-to-plant flows are available for this run yet."
        />
      </Card>

      <Card>
        <CardHeader title="Plant → Zone Flows" />
        <SortableTable
          caption="Flow from each treatment plant to the demand zone it supplies"
          columns={flowColumns("Plant", "Zone")}
          rows={plantToZone}
          getRowKey={(f) => f.key}
          emptyMessage="No plant-to-zone flows are available for this run yet."
        />
      </Card>
    </div>
  );
}
