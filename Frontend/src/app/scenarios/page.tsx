"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Button } from "@/components/ui/Button";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { ScenarioStatusBadge } from "@/components/scenarios/ScenarioStatusBadge";
import { TableSkeleton } from "@/components/states/Skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { FailedState } from "@/components/states/FailedState";
import { getScenarios } from "@/services/scenarioApi";
import { createRun } from "@/services/runApi";
import { toAppError } from "@/services/errorMapping";
import { formatDateTime } from "@/utils/formatters";
import type { ScenarioSummary } from "@/types/scenario";
import type { AppError } from "@/types/errors";
import { useRouter } from "next/navigation";

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<AppError | null>(null);

  function load() {
    getScenarios()
      .then((data) => {
        setScenarios(data);
        setError(null);
      })
      .catch((err) => setError(toAppError(err)));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRun(scenarioId: string) {
    setRunningId(scenarioId);
    setRunError(null);
    try {
      const { runId } = await createRun(scenarioId, { forceRerun: false });
      router.push(`/runs/${runId}`);
    } catch (err) {
      setRunError(toAppError(err));
      setRunningId(null);
    }
  }

  const columns: Column<ScenarioSummary>[] = [
    {
      key: "name",
      header: "Scenario Name",
      sortValue: (s) => s.scenarioName,
      render: (s) => (
        <div>
          <div className="font-medium text-ink">{s.scenarioName}</div>
          <div className="font-mono text-xs text-ink-faint">{s.scenarioId}</div>
        </div>
      ),
    },
    { key: "status", header: "Status", sortValue: (s) => s.status, render: (s) => <ScenarioStatusBadge status={s.status} /> },
    { key: "description", header: "Description", render: (s) => s.description ?? "—" },
    { key: "updated", header: "Last Modified", sortValue: (s) => s.updatedAt, render: (s) => formatDateTime(s.updatedAt) },
    {
      key: "run",
      header: "Most Recent Run",
      render: (s) => (s.mostRecentRun ? <Link href={`/runs/${s.mostRecentRun.runId}`} className="text-primary hover:underline">{s.mostRecentRun.status}</Link> : "—"),
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <div className="flex items-center gap-3 justify-end">
          <Link href={`/scenarios/${s.scenarioId}`} className="text-primary hover:underline">
            View
          </Link>
          <Link href={`/scenarios/${s.scenarioId}/edit`} className="text-primary hover:underline">
            Edit
          </Link>
          <Button size="sm" disabled={s.status !== "ready" || runningId === s.scenarioId} onClick={() => handleRun(s.scenarioId)}>
            {runningId === s.scenarioId ? "Starting…" : "Run Optimisation"}
          </Button>
        </div>
      ),
      align: "right",
    },
  ];

  return (
    <PageContainer className="py-8">
      <PageHeading
        title="Scenarios"
        action={
          <Link href="/scenarios/new">
            <Button>New Scenario</Button>
          </Link>
        }
      />

      {runError ? <div className="mb-4"><FailedState message="Could not start this optimisation run." detail={runError.message} /></div> : null}

      {error ? <FailedState message="Could not load scenarios." detail={error.message} /> : null}
      {!error && scenarios === null ? <TableSkeleton columns={6} /> : null}
      {!error && scenarios !== null && scenarios.length === 0 ? (
        <EmptyState title="No scenarios yet" description="Create your first scenario to configure sources, plants, and demand." action={<Link href="/scenarios/new"><Button>New Scenario</Button></Link>} />
      ) : null}
      {!error && scenarios !== null && scenarios.length > 0 ? (
        <SortableTable caption="Saved scenarios" columns={columns} rows={scenarios} getRowKey={(s) => s.scenarioId} />
      ) : null}
    </PageContainer>
  );
}
