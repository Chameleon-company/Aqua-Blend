"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { SummarySkeleton } from "@/components/states/Skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { FailedState } from "@/components/states/FailedState";
import { getScenarios } from "@/services/scenarioApi";
import { toAppError } from "@/services/errorMapping";
import { formatDateTime, formatNumber } from "@/utils/formatters";
import { getRunStatusMeta } from "@/utils/resultStatus";
import type { ScenarioSummary } from "@/types/scenario";
import type { AppError } from "@/types/errors";

export default function DashboardPage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let cancelled = false;
    getScenarios()
      .then((data) => {
        if (!cancelled) setScenarios(data);
      })
      .catch((err) => {
        if (!cancelled) setError(toAppError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = scenarios?.filter((s) => s.status === "ready").length ?? 0;
  const draft = scenarios?.filter((s) => s.status === "draft").length ?? 0;
  const invalid = scenarios?.filter((s) => s.status === "invalid").length ?? 0;
  const recentRuns = (scenarios ?? [])
    .filter((s) => s.mostRecentRun)
    .sort((a, b) => (b.mostRecentRun!.createdAt).localeCompare(a.mostRecentRun!.createdAt))
    .slice(0, 6);

  return (
    <PageContainer className="py-8">
      <PageHeading
        title="Dashboard"
        description="Create and configure scenarios, then run optimisations and review results."
        action={
          <Link href="/scenarios/new">
            <Button>New Scenario</Button>
          </Link>
        }
      />

      {error ? <FailedState message="Could not load the dashboard." detail={error.message} /> : null}

      {!error && scenarios === null ? (
        <Section id="loading" title="Loading">
          <SummarySkeleton />
        </Section>
      ) : null}

      {!error && scenarios !== null ? (
        <>
          <Section id="summary" title="Scenario Summary">
            <dl className="flex flex-wrap gap-x-10 gap-y-5">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total Scenarios</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatNumber(scenarios.length, 0)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Ready</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatNumber(ready, 0)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Draft</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatNumber(draft, 0)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Not Ready</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{formatNumber(invalid, 0)}</dd>
              </div>
            </dl>
          </Section>

          <Section
            id="recent-runs"
            title="Recent Runs"
            action={
              <Link href="/scenarios" className="text-sm text-primary hover:underline">
                View all scenarios
              </Link>
            }
          >
            {recentRuns.length === 0 ? (
              <EmptyState title="No runs yet" description="Create a scenario and run an optimisation to see it here." />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentRuns.map((s) => {
                  const run = s.mostRecentRun!;
                  const meta = getRunStatusMeta(run.status);
                  return (
                    <li key={run.runId} className="py-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink">{s.scenarioName}</p>
                        <p className="text-xs text-ink-faint">{formatDateTime(run.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill label={meta.label} tone={meta.tone} />
                        <Link href={`/runs/${run.runId}`} className="text-sm text-primary hover:underline">
                          View
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      ) : null}
    </PageContainer>
  );
}
