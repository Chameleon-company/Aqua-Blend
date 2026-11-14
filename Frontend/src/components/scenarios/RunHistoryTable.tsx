import Link from "next/link";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime } from "@/utils/formatters";
import { getRunStatusMeta, SOLVER_OUTCOME_META } from "@/utils/resultStatus";
import type { RunSummary } from "@/types/run";

/** Cache column (AquaBlend_Frontend_Final_Integration_Implementation.md §25): Forced takes
 *  precedence in display since a forced run is never a cache hit (Backend/Services/RunService.cs). */
function CacheBadge({ run }: { run: RunSummary }) {
  if (run.forceRerun) return <StatusPill label="Forced" tone="warning" />;
  if (run.milpCacheHit) return <StatusPill label="Reused" tone="info" />;
  return <StatusPill label="Fresh" tone="neutral" />;
}

export function RunHistoryTable({ runs }: { runs: RunSummary[] }) {
  const columns: Column<RunSummary>[] = [
    { key: "run", header: "Run", sortValue: (r) => r.runId, render: (r) => <span className="font-mono text-xs">{r.runId}</span> },
    { key: "created", header: "Created At", sortValue: (r) => r.createdAt, render: (r) => formatDateTime(r.createdAt) },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = getRunStatusMeta(r.status);
        return <StatusPill label={meta.label} tone={meta.tone} />;
      },
    },
    {
      key: "solverStatus",
      header: "Solver Status",
      render: (r) => (r.solverOutcome ? <StatusPill label={SOLVER_OUTCOME_META[r.solverOutcome].label} tone={SOLVER_OUTCOME_META[r.solverOutcome].tone} /> : "—"),
    },
    { key: "cache", header: "Cache", render: (r) => <CacheBadge run={r} /> },
    {
      key: "view",
      header: "",
      render: (r) => (
        <Link href={`/runs/${r.runId}`} className="text-primary hover:underline">
          {r.status === "completed" ? "View Results" : "View Run"}
        </Link>
      ),
    },
  ];

  return (
    <SortableTable
      caption="Run history for this scenario"
      columns={columns}
      rows={runs}
      getRowKey={(r) => r.runId}
      emptyMessage="No runs have been created for this scenario yet."
    />
  );
}
