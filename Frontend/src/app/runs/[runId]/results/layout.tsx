"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { RunStatus } from "@/components/runs/RunStatus";
import { FailedState } from "@/components/states/FailedState";
import { SummarySkeleton } from "@/components/states/Skeleton";
import { useRunPolling, type AsyncPhase } from "@/hooks/useRunPolling";
import { isTerminalWorkflowStatus } from "@/types/run";
import type { Run } from "@/types/run";
import type { MilpResultViewModel } from "@/types/milp-results";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";

/**
 * Fetches the run + results + AI analysis + diagnostics exactly once for
 * both /results/milp and /results/ai, and owns the states that apply to the
 * whole analysis workspace regardless of which tab is open (run still
 * solving, run failed, results unavailable). Each tab then handles its own
 * feasible/infeasible/AI-unavailable rendering independently, so one
 * failure never takes down the other tab.
 */
export interface AnalysisContextValue {
  runId: string;
  run?: Run;
  results: MilpResultViewModel;
  aiPhase: AsyncPhase;
  aiAnalysis?: AIAnalysisResult;
  diagnosticsPhase: AsyncPhase;
  diagnostics?: DiagnosticsResult;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function useAnalysisContext(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysisContext must be used within the results layout");
  return ctx;
}

export default function ResultsLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const polling = useRunPolling(runId);

  return (
    <PageContainer className="py-8">
      <div className="mb-6">
        <Link href={`/runs/${runId}`} className="text-sm text-primary hover:underline">
          ← Back to run
        </Link>
      </div>

      <PageHeading title="Analysis" description="Solver results and AI-assisted interpretation for this run." action={<p className="font-mono text-sm text-ink-muted">{runId}</p>} />

      <div className="mb-8">
        <RunStatus
          status={polling.run?.status}
          runId={polling.run?.runId}
          scenarioId={polling.run?.scenarioId}
          scenarioName={polling.run?.scenarioName}
          progressMessage={polling.run?.progressMessage}
          objectiveValue={polling.run?.objectiveValue}
          solveTimeMs={polling.run?.solveTimeMs}
          loading={polling.loading}
        />
      </div>

      {polling.error ? <FailedState message={polling.error.message} /> : null}

      {polling.run && !isTerminalWorkflowStatus(polling.run.status) ? (
        <p className="text-sm text-ink-muted">Analysis will appear once this run reaches a completed state.</p>
      ) : null}

      {polling.run?.status === "failed" ? (
        <FailedState message="The solver failed to produce a result for this run." detail={polling.run.error} />
      ) : null}

      {polling.resultsPhase === "loading" ? <SummarySkeleton /> : null}

      {polling.resultsPhase === "failed" ? (
        <FailedState message="Could not load results for this run." detail={polling.resultsError?.message} />
      ) : null}

      {polling.results ? (
        <AnalysisContext.Provider
          value={{
            runId,
            run: polling.run,
            results: polling.results,
            aiPhase: polling.aiPhase,
            aiAnalysis: polling.aiAnalysis,
            diagnosticsPhase: polling.diagnosticsPhase,
            diagnostics: polling.diagnostics,
          }}
        >
          {children}
        </AnalysisContext.Provider>
      ) : null}
    </PageContainer>
  );
}
