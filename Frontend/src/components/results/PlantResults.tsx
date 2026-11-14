import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import type { PlantUtilisation } from "@/types/milp-results";

export function PlantResults({ plants }: { plants: PlantUtilisation[] }) {
  const columns: Column<PlantUtilisation>[] = [
    {
      key: "plant",
      header: "Plant",
      sortValue: (p) => p.plantName ?? p.plantId,
      render: (p) => (
        <div>
          <div className="font-medium text-ink">{p.plantName ?? p.plantId}</div>
          {p.plantName ? <div className="font-mono text-xs text-ink-faint">{p.plantId}</div> : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusPill label={p.isActive ? "Active" : "Inactive"} tone={p.isActive ? "success" : "neutral"} />,
    },
    {
      key: "throughput",
      header: "Throughput",
      align: "right",
      sortValue: (p) => p.throughputMlPerDay,
      render: (p) => formatMlPerDay(p.throughputMlPerDay),
    },
    {
      key: "utilisation",
      header: "Utilisation",
      align: "right",
      sortValue: (p) => p.utilisationPercent ?? null,
      render: (p) => (p.utilisationPercent !== undefined ? formatPercent(p.utilisationPercent) : MISSING_VALUE),
    },
    {
      key: "fixedCost",
      header: "Fixed Cost",
      align: "right",
      sortValue: (p) => p.fixedCostContribution,
      render: (p) => formatCurrency(p.fixedCostContribution),
    },
    {
      key: "treatmentCost",
      header: "Treatment Cost",
      align: "right",
      sortValue: (p) => p.treatmentCostContribution,
      render: (p) => formatCurrency(p.treatmentCostContribution),
    },
  ];

  return (
    <SortableTable
      caption="Treatment plants and their throughput / cost contribution"
      columns={columns}
      rows={plants}
      getRowKey={(p) => p.plantId}
      emptyMessage="No plants are active in this solution."
    />
  );
}
