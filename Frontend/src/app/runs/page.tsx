"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { TableSkeleton } from "@/components/states/Skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { FailedState } from "@/components/states/FailedState";
import { getScenarios } from "@/services/scenarioApi";
import { getScenarioRuns } from "@/services/runApi";
import { toAppError } from "@/services/errorMapping";
import { formatDateTime } from "@/utils/formatters";
import { getRunStatusMeta, SOLVER_OUTCOME_META } from "@/utils/resultStatus";
import type { RunSummary } from "@/types/run";
import type { AppError } from "@/types/errors";

interface RunRow extends RunSummary {
  scenarioName: string;
}

export default function RunsPage() {
  const [rows, setRows] = useState<RunRow[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const scenarios = await getScenarios();
        const perScenario = await Promise.all(
          scenarios.map(async (scenario) => {
            const runs = await getScenarioRuns(scenario.scenarioId);
            return runs.map((run) => ({ ...run, scenarioName: scenario.scenarioName }));
          }),
        );
        if (cancelled) return;
        const merged = perScenario.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setRows(merged);
      } catch (err) {
        if (!cancelled) setError(toAppError(err));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<RunRow>[] = [
    { key: "run", header: "Run", sortValue: (r) => r.runId, render: (r) => <span className="font-mono text-xs">{r.runId}</span> },
    { key: "scenario", header: "Scenario", sortValue: (r) => r.scenarioName, render: (r) => <span className="font-medium text-ink">{r.scenarioName}</span> },
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
    {
      key: "cache",
      header: "Cache",
      render: (r) => (r.forceRerun ? <StatusPill label="Forced" tone="warning" /> : r.milpCacheHit ? <StatusPill label="Reused" tone="info" /> : <StatusPill label="Fresh" tone="neutral" />),
    },
    {
      key: "view",
      header: "",
      align: "right",
      render: (r) => (
        <Link href={`/runs/${r.runId}`} className="text-primary hover:underline">
          {r.status === "completed" ? "View Results" : "View Run"}
        </Link>
      ),
    },
  ];

  return (
    <PageContainer className="py-8">
      <PageHeading title="Runs" description="Every optimisation run across all scenarios, most recent first." />

      {error ? <FailedState message="Could not load runs." detail={error.message} /> : null}
      {!error && rows === null ? <TableSkeleton columns={6} /> : null}
      {!error && rows !== null && rows.length === 0 ? (
        <EmptyState title="No runs yet" description="Run an optimisation from a scenario to see it here." />
      ) : null}
      {!error && rows !== null && rows.length > 0 ? (
        <SortableTable caption="All optimisation runs" columns={columns} rows={rows} getRowKey={(r) => r.runId} />
      ) : null}
    </PageContainer>
  );
}
