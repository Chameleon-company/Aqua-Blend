import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatPercent, MISSING_VALUE } from "@/utils/formatters";
import { STRESS_TEST_STATE_META } from "@/utils/resultStatus";
import type { StressTestResult } from "@/types/stress-test";

const KIND_LABELS: Record<string, string> = {
  increase_demand: "Increase demand",
  reduce_plant_capacity: "Reduce plant capacity",
  disable_source: "Disable source",
  reduce_link_capacity: "Reduce link capacity",
  stricter_quality_limits: "Stricter water-quality limits",
};

export function StressTestResults({ tests }: { tests: StressTestResult[] }) {
  const columns: Column<StressTestResult>[] = [
    { key: "test", header: "Test", sortValue: (t) => t.config.kind, render: (t) => KIND_LABELS[t.config.kind] ?? t.config.kind },
    {
      key: "variation",
      header: "Variation",
      render: (t) => (t.config.targetId ? `${t.config.targetId}${t.config.variationPercent !== undefined ? ` (${t.config.variationPercent}%)` : ""}` : t.config.variationPercent !== undefined ? `${t.config.variationPercent}%` : MISSING_VALUE),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (t) => t.status,
      render: (t) => {
        const meta = STRESS_TEST_STATE_META[t.status];
        return <StatusPill label={meta.label} tone={meta.tone} />;
      },
    },
    {
      key: "feasible",
      header: "Feasible / Infeasible",
      render: (t) => (t.status !== "completed" || t.feasible === undefined ? MISSING_VALUE : <StatusPill label={t.feasible ? "Feasible" : "Infeasible"} tone={t.feasible ? "success" : "danger"} />),
    },
    {
      key: "objectiveChange",
      header: "Objective Change",
      align: "right",
      sortValue: (t) => t.objectiveChangePercent ?? null,
      render: (t) => (t.objectiveChangePercent !== undefined ? `+${formatPercent(t.objectiveChangePercent / 100)}` : MISSING_VALUE),
    },
    {
      key: "criticalConstraint",
      header: "Critical Constraint",
      render: (t) => t.criticalConstraint ?? MISSING_VALUE,
    },
  ];

  return (
    <SortableTable
      caption="Stress test results for this run"
      columns={columns}
      rows={tests}
      getRowKey={(t) => t.stressTestId}
      emptyMessage="No stress tests have been run for this result yet."
    />
  );
}
