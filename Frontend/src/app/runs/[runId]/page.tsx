"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { SummarySkeleton } from "@/components/states/Skeleton";
import { FailedState } from "@/components/states/FailedState";
import { InfeasibleState } from "@/components/states/InfeasibleState";
import { EmptyState } from "@/components/states/EmptyState";
import { RunWorkflowProgress } from "@/components/runs/RunWorkflowProgress";
import { RunCacheBadges } from "@/components/runs/RunCacheBadges";
import { RunErrorState } from "@/components/runs/RunErrorState";
import { RunInputSnapshot } from "@/components/runs/RunInputSnapshot";
import { MilpResultSummary } from "@/components/runs/MilpResultSummary";
import { MilpCostBreakdown } from "@/components/runs/MilpCostBreakdown";
import { MilpSourceResults } from "@/components/runs/MilpSourceResults";
import { MilpPlantResults } from "@/components/runs/MilpPlantResults";
import { MilpDemandZoneResults } from "@/components/runs/MilpDemandZoneResults";
import { MilpFlowResults } from "@/components/runs/MilpFlowResults";
import { MilpQualityResults } from "@/components/runs/MilpQualityResults";
import { MilpBindingConstraints } from "@/components/runs/MilpBindingConstraints";
import { MilpSolverDetails } from "@/components/runs/MilpSolverDetails";
import { AiAnalysisSection } from "@/components/runs/AiAnalysisSection";
import { useRunAggregate } from "@/hooks/useRunAggregate";
import { createRun } from "@/services/runApi";
import { toAppError } from "@/services/errorMapping";
import { getRunStatusMeta } from "@/utils/resultStatus";
import { asArray, asRecord } from "@/utils/jsonAccess";
import type { AppError } from "@/types/errors";
import type { RunWarning } from "@/types/milp-results";

function toRunWarnings(raw: unknown): RunWarning[] {
  return asArray(raw).map((item) => {
    if (typeof item === "string") return { message: item };
    const r = asRecord(item);
    const message = typeof r.message === "string" ? r.message : JSON.stringify(item);
    const severity = r.severity === "info" || r.severity === "warning" || r.severity === "critical" ? r.severity : undefined;
    return { message, severity };
  });
}

export default function RunPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const runId = params.runId;
  const { data, loading, error, refresh } = useRunAggregate(runId);

  const [forcing, setForcing] = useState(false);
  const [forceError, setForceError] = useState<AppError | null>(null);

  async function handleForceRerun(scenarioId: string) {
    setForcing(true);
    setForceError(null);
    try {
      const { runId: newRunId } = await createRun(scenarioId, { forceRerun: true });
      router.push(`/runs/${newRunId}`);
    } catch (err) {
      setForceError(toAppError(err));
      setForcing(false);
    }
  }

  if (error) {
    return (
      <PageContainer className="py-8">
        <FailedState message="Unable to load run." detail={error.message} onRetry={refresh} />
      </PageContainer>
    );
  }

  if (loading || !data) {
    return (
      <PageContainer className="py-8">
        <SummarySkeleton />
      </PageContainer>
    );
  }

  const { run, scenario, input, milpOutput, aiOutput } = data;
  const isFailed = run.status === "failed";
  const output = milpOutput;
  const infeasible = output !== null && output.solverIsFeasible === false;
  const statusMeta = getRunStatusMeta(run.status);

  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <Link href={`/scenarios/${run.scenarioId}`} className="text-sm text-primary hover:underline">
          ← Back to scenario
        </Link>
      </div>

      <PageHeading
        title="Run"
        description={run.scenarioName ?? undefined}
        action={
          <div className="flex items-center gap-3">
            <p className="font-mono text-sm text-ink-muted">{run.runId}</p>
            <Button variant="secondary" size="sm" disabled={forcing} onClick={() => handleForceRerun(run.scenarioId)}>
              {forcing ? "Starting…" : "Force full re-run"}
            </Button>
          </div>
        }
      />
      <p className="-mt-4 mb-6 text-xs text-ink-faint">
        Force re-run ignores a reusable optimisation result and executes the MILP again. It does not change the scenario input.
      </p>

      {forceError ? (
        <div className="mb-6">
          <FailedState message="Could not start a forced re-run." detail={forceError.message} />
        </div>
      ) : null}

      <Section id="status" title="Run Status">
        <div className="flex flex-col gap-3">
          <RunWorkflowProgress
            status={run.status}
            progressMessage={run.progressMessage}
            milpStartedAt={run.milpStartedAt}
            milpCompletedAt={run.milpCompletedAt}
            runId={run.runId}
            scenarioId={run.scenarioId}
            scenarioName={run.scenarioName}
            objectiveValue={run.objectiveValue}
            solveTimeMs={run.solveTimeMs}
          />
          <RunCacheBadges
            forceRerun={run.forceRerun}
            milpCacheHit={run.milpCacheHit}
            aiCacheHit={run.aiCacheHit}
            isLegacyFallback={output?.isLegacyFallback}
          />
        </div>
      </Section>

      {isFailed ? (
        <Section id="failed" title="Run Failed">
          <RunErrorState run={run} />
          <div className="mt-4">
            <Link href={`/scenarios/${run.scenarioId}`}>
              <Button variant="secondary">Back to Scenario</Button>
            </Link>
          </div>
        </Section>
      ) : null}

      <Section id="input" title="Run Input">
        <RunInputSnapshot input={input} scenario={scenario} />
      </Section>

      {!isFailed && !output ? (
        <Section id="optimisation" title="Optimisation">
          <EmptyState title={statusMeta.label} description={statusMeta.description ?? "Waiting for the optimisation to progress."} />
        </Section>
      ) : null}

      {output && infeasible ? (
        <Section id="milp" title="Optimisation Result">
          <InfeasibleState
            scenarioId={run.scenarioId}
            resultId={output.id || undefined}
            feasibilityState={output.solverMessage ?? undefined}
            warnings={toRunWarnings(output.warnings)}
          />
        </Section>
      ) : null}

      {output && !infeasible ? (
        <>
          <Section id="milp-summary" title="Optimisation Summary">
            <MilpResultSummary output={output} />
          </Section>
          <Section id="cost" title="Cost Breakdown">
            <MilpCostBreakdown output={output} />
          </Section>
          <Section id="sources" title="Source Selection">
            <MilpSourceResults output={output} />
          </Section>
          <Section id="plants" title="Plant Utilisation">
            <MilpPlantResults output={output} />
          </Section>
          <Section id="demand" title="Demand Fulfilment">
            <MilpDemandZoneResults output={output} />
          </Section>
          <Section id="flows" title="Flows">
            <MilpFlowResults output={output} />
          </Section>
          <Section id="quality" title="Water Quality">
            <MilpQualityResults output={output} />
          </Section>
          <Section id="constraints" title="Binding Constraints and Warnings">
            <MilpBindingConstraints output={output} />
          </Section>
          <Section id="solver" title="Solver Details">
            <MilpSolverDetails output={output} />
          </Section>
        </>
      ) : null}

      {!isFailed ? (
        <Section id="ai" title="AI Analysis">
          <AiAnalysisSection status={run.status} aiOutput={aiOutput} milpOutput={output} />
        </Section>
      ) : null}
    </PageContainer>
  );
}
