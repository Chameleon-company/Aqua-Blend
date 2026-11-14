import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { formatCurrency, formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import { asArray, asRecord, pickBoolean, pickNumber, pickString } from "@/utils/jsonAccess";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpSourceResultsProps {
  output: MilpModelOutputDto;
}

interface SourceRow {
  key: string;
  sourceId: string;
  name: string | null;
  selected: boolean | null;
  withdrawal: number | null;
  utilisation: number | null;
  variableCost: number | null;
  fixedCost: number | null;
  status: string | null;
}

function toSourceRow(raw: unknown, index: number): SourceRow {
  const r = asRecord(raw);
  return {
    key: pickString(r, "source_id", "sourceId") ?? `source-${index}`,
    sourceId: pickString(r, "source_id", "sourceId") ?? MISSING_VALUE,
    name: pickString(r, "source_name", "sourceName"),
    selected: pickBoolean(r, "activated", "is_selected", "model_included"),
    withdrawal: pickNumber(r, "withdrawal_ml_per_day"),
    utilisation: pickNumber(r, "utilisation_percent"),
    variableCost: pickNumber(r, "variable_withdrawal_cost", "withdrawal_cost_contribution"),
    fixedCost: pickNumber(r, "fixed_cost_contribution"),
    status: pickString(r, "selection_status", "exclusion_reason_code", "reason"),
  };
}

/** Source Selection (AquaBlend_Frontend_Final_Integration_Implementation.md §13/§17). */
export function MilpSourceResults({ output }: MilpSourceResultsProps) {
  const rows = asArray(output.sources).map(toSourceRow);

  const columns: Column<SourceRow>[] = [
    {
      key: "source",
      header: "Source",
      sortValue: (s) => s.name ?? s.sourceId,
      render: (s) => (
        <div>
          <div className="font-medium text-ink">{s.name ?? s.sourceId}</div>
          {s.name ? <div className="font-mono text-xs text-ink-faint">{s.sourceId}</div> : null}
        </div>
      ),
    },
    {
      key: "selected",
      header: "Selected",
      render: (s) => (s.selected === null ? MISSING_VALUE : <StatusPill label={s.selected ? "Active" : "Inactive"} tone={s.selected ? "success" : "neutral"} />),
    },
    { key: "withdrawal", header: "Withdrawal", align: "right", sortValue: (s) => s.withdrawal, render: (s) => formatMlPerDay(s.withdrawal) },
    { key: "utilisation", header: "Utilisation", align: "right", sortValue: (s) => s.utilisation, render: (s) => (s.utilisation !== null ? formatPercent(s.utilisation) : MISSING_VALUE) },
    { key: "variableCost", header: "Variable Cost", align: "right", sortValue: (s) => s.variableCost, render: (s) => formatCurrency(s.variableCost) },
    { key: "fixedCost", header: "Fixed Cost", align: "right", sortValue: (s) => s.fixedCost, render: (s) => formatCurrency(s.fixedCost) },
    { key: "status", header: "Notes", render: (s) => s.status ?? MISSING_VALUE },
  ];

  return (
    <Card>
      <CardHeader title="Source Selection" />
      <SortableTable
        caption="Water sources and their contribution to the solved blend"
        columns={columns}
        rows={rows}
        getRowKey={(s) => s.key}
        emptyMessage="No source results are available for this run yet."
      />
    </Card>
  );
}
