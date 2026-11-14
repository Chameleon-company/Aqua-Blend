import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { formatCurrency, formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import { asArray, asRecord, pickBoolean, pickNumber, pickString } from "@/utils/jsonAccess";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpPlantResultsProps {
  output: MilpModelOutputDto;
}

interface PlantRow {
  key: string;
  plantId: string;
  name: string | null;
  active: boolean | null;
  throughput: number | null;
  utilisation: number | null;
  variableCost: number | null;
  fixedCost: number | null;
}

function toPlantRow(raw: unknown, index: number): PlantRow {
  const r = asRecord(raw);
  return {
    key: pickString(r, "plant_id", "plantId") ?? `plant-${index}`,
    plantId: pickString(r, "plant_id", "plantId") ?? MISSING_VALUE,
    name: pickString(r, "plant_name", "plantName"),
    active: pickBoolean(r, "activated", "is_active"),
    throughput: pickNumber(r, "throughput_ml_per_day"),
    utilisation: pickNumber(r, "utilisation_percent"),
    variableCost: pickNumber(r, "variable_treatment_cost", "treatment_cost_contribution"),
    fixedCost: pickNumber(r, "fixed_cost_contribution"),
  };
}

/** Plant Utilisation (AquaBlend_Frontend_Final_Integration_Implementation.md §13/§17). */
export function MilpPlantResults({ output }: MilpPlantResultsProps) {
  const rows = asArray(output.plants).map(toPlantRow);

  const columns: Column<PlantRow>[] = [
    {
      key: "plant",
      header: "Plant",
      sortValue: (p) => p.name ?? p.plantId,
      render: (p) => (
        <div>
          <div className="font-medium text-ink">{p.name ?? p.plantId}</div>
          {p.name ? <div className="font-mono text-xs text-ink-faint">{p.plantId}</div> : null}
        </div>
      ),
    },
    {
      key: "active",
      header: "Active",
      render: (p) => (p.active === null ? MISSING_VALUE : <StatusPill label={p.active ? "Active" : "Inactive"} tone={p.active ? "success" : "neutral"} />),
    },
    { key: "throughput", header: "Treated Volume", align: "right", sortValue: (p) => p.throughput, render: (p) => formatMlPerDay(p.throughput) },
    { key: "utilisation", header: "Utilisation", align: "right", sortValue: (p) => p.utilisation, render: (p) => (p.utilisation !== null ? formatPercent(p.utilisation) : MISSING_VALUE) },
    { key: "variableCost", header: "Treatment Cost", align: "right", sortValue: (p) => p.variableCost, render: (p) => formatCurrency(p.variableCost) },
    { key: "fixedCost", header: "Fixed Cost", align: "right", sortValue: (p) => p.fixedCost, render: (p) => formatCurrency(p.fixedCost) },
  ];

  return (
    <Card>
      <CardHeader title="Plant Utilisation" />
      <SortableTable
        caption="Treatment plants and their throughput / cost contribution"
        columns={columns}
        rows={rows}
        getRowKey={(p) => p.key}
        emptyMessage="No plant results are available for this run yet."
      />
    </Card>
  );
}
