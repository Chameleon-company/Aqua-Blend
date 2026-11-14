"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Section } from "@/components/layout/Section";
import { FailedState } from "@/components/states/FailedState";
import { SummarySkeleton, TableSkeleton } from "@/components/states/Skeleton";
import { StressTestForm } from "@/components/stress-testing/StressTestForm";
import { StressTestResults } from "@/components/stress-testing/StressTestResults";
import { useRunPolling } from "@/hooks/useRunPolling";
import { useStressTests } from "@/hooks/useStressTests";

export default function StressTestingPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const polling = useRunPolling(runId);
  const stressTests = useStressTests(runId);

  const canStressTest = polling.run?.status === "completed" && polling.run.solverOutcome === "optimal";

  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <Link href={`/runs/${runId}/results`} className="text-sm text-primary hover:underline">
          ← Back to results
        </Link>
      </div>

      <PageHeading title="Stress Testing" description="Configure a controlled test against this result. The backend executes it." action={<p className="font-mono text-sm text-ink-muted">{runId}</p>} />

      {polling.error ? <FailedState message={polling.error.message} /> : null}

      {polling.loading || polling.resultsPhase === "loading" ? (
        <Section id="loading" title="Loading">
          <SummarySkeleton />
        </Section>
      ) : null}

      {polling.run && !canStressTest ? (
        <Section id="unavailable" title="Stress Testing Unavailable">
          <p className="text-sm text-ink-muted">
            Stress testing requires a completed run with a feasible result. This run is {polling.run.status}
            {polling.run.solverOutcome ? ` (${polling.run.solverOutcome})` : ""}.
          </p>
        </Section>
      ) : null}

      {canStressTest && polling.results ? (
        <Section id="form" title="Configure Stress Test">
          <StressTestForm result={polling.results} submitting={stressTests.creating} onSubmit={stressTests.create} />
          {stressTests.createError ? (
            <div className="mt-4">
              <FailedState message="Could not run this stress test." detail={stressTests.createError.message} />
            </div>
          ) : null}
        </Section>
      ) : null}

      {canStressTest ? (
        <Section id="results" title="Stress Test Results">
          {stressTests.loading ? <TableSkeleton /> : null}
          {stressTests.error ? <FailedState message="Could not load stress test results." detail={stressTests.error.message} /> : null}
          {!stressTests.loading && !stressTests.error ? <StressTestResults tests={stressTests.tests} /> : null}
        </Section>
      ) : null}
    </PageContainer>
  );
}
