"use client";

/**
 * The single centralized run-tracking flow for the /results/* chart pages:
 * poll the run until it reaches a REAL terminal workflow status, then build
 * MILP results / AI analysis / (for an infeasible outcome) diagnostics.
 * `/runs/[runId]/results` and `/runs/[runId]/stress-testing` consume this
 * hook (the `/runs/[runId]` overview page uses hooks/useRunAggregate.ts
 * directly instead).
 *
 * Both `results` and `aiAnalysis` are now derived from the SAME
 * GET /api/runs/{id} aggregate call this hook already needs for `run` —
 * see utils/runResultAdapters.ts. This hook previously called the legacy
 * GET /api/runs/{id}/results and /ai-analysis endpoints, which only ever
 * read the pre-real-backend public.OptimisationResults table
 * (Backend/Services/RunService.cs's GetResultJsonAsync — "never written to
 * for new architecture runs"). Every run created through the current
 * pipeline therefore 409'd with "The result was requested before the run
 * reached a terminal state" regardless of whether it had actually
 * completed. Reading milpOutput/aiOutput off the aggregate response fixes
 * this without touching the backend.
 *
 * Run creation itself happens via `runApi.createRun(scenarioId)` from the
 * scenario page, not here — this hook only tracks an already-created run.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getRunAggregate } from "@/services/runApi";
import { getDiagnostics } from "@/services/analysisApi";
import { toAppError } from "@/services/errorMapping";
import { isTerminalWorkflowStatus } from "@/types/run";
import { mapAiOutputToAiAnalysisResult, mapMilpOutputToViewModel } from "@/utils/runResultAdapters";
import type { Run, RunAggregateDto } from "@/types/run";
import type { MilpResultViewModel } from "@/types/milp-results";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";
import type { AppError } from "@/types/errors";

// Matches hooks/useRunAggregate.ts's cadence — both hit the same backend
// behind a small Supabase connection-pool budget shared across every open tab.
const POLL_INTERVAL_MS = 3000;

export type AsyncPhase = "idle" | "loading" | "ready" | "failed";

export interface UseRunPollingResult {
  run?: Run;
  loading: boolean;
  error?: AppError;
  resultsPhase: AsyncPhase;
  results?: MilpResultViewModel;
  resultsError?: AppError;
  aiPhase: AsyncPhase;
  aiAnalysis?: AIAnalysisResult;
  aiError?: AppError;
  diagnosticsPhase: AsyncPhase;
  diagnostics?: DiagnosticsResult;
  diagnosticsError?: AppError;
}

/** Type-level cast, not a value transform — every consumer renders status via getRunStatusMeta, which handles any string safely. */
function aggregateToLegacyRun(aggregate: RunAggregateDto): Run {
  const dto = aggregate.run;
  return {
    runId: dto.runId,
    scenarioId: dto.scenarioId,
    scenarioName: dto.scenarioName ?? undefined,
    status: dto.status as Run["status"],
    solverOutcome: (dto.solverOutcome ?? undefined) as Run["solverOutcome"],
    progressMessage: dto.progressMessage ?? undefined,
    createdAt: dto.createdAt,
    solveTimeMs: dto.solveTimeMs ?? undefined,
    objectiveValue: dto.objectiveValue ?? undefined,
    error: dto.error ?? undefined,
  };
}

export function useRunPolling(runId: string): UseRunPollingResult {
  const [run, setRun] = useState<Run | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | undefined>(undefined);

  const [resultsPhase, setResultsPhase] = useState<AsyncPhase>("idle");
  const [results, setResults] = useState<MilpResultViewModel | undefined>(undefined);
  const [resultsError, setResultsError] = useState<AppError | undefined>(undefined);

  const [aiPhase, setAiPhase] = useState<AsyncPhase>("idle");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | undefined>(undefined);
  const [aiError] = useState<AppError | undefined>(undefined);

  const [diagnosticsPhase, setDiagnosticsPhase] = useState<AsyncPhase>("idle");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | undefined>(undefined);
  const [diagnosticsError, setDiagnosticsError] = useState<AppError | undefined>(undefined);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedTerminalDataRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const applyTerminalData = useCallback(
    (aggregate: RunAggregateDto) => {
      if (fetchedTerminalDataRef.current) return;
      fetchedTerminalDataRef.current = true;

      const { run: dto, milpOutput, aiOutput } = aggregate;
      if (dto.status === "failed") return;

      if (milpOutput) {
        setResults(mapMilpOutputToViewModel(dto, milpOutput));
        setResultsPhase("ready");
      } else {
        setResultsError(toAppError(new Error("No optimisation result is available for this run.")));
        setResultsPhase("failed");
      }

      setAiAnalysis(mapAiOutputToAiAnalysisResult(dto.runId, dto.status, aiOutput));
      setAiPhase("ready");

      if (milpOutput?.solverIsFeasible === false) {
        setDiagnosticsPhase("loading");
        getDiagnostics(runId)
          .then((data) => {
            setDiagnostics(data);
            setDiagnosticsPhase("ready");
          })
          .catch((err) => {
            setDiagnosticsError(toAppError(err));
            setDiagnosticsPhase("failed");
          });
      }
    },
    [runId],
  );

  useEffect(() => {
    let cancelled = false;
    fetchedTerminalDataRef.current = false;

    async function poll() {
      try {
        const aggregate = await getRunAggregate(runId);
        if (cancelled) return;
        setRun(aggregateToLegacyRun(aggregate));
        setLoading(false);
        setError(undefined);
        if (isTerminalWorkflowStatus(aggregate.run.status)) {
          stopPolling();
          applyTerminalData(aggregate);
        }
      } catch (err) {
        if (cancelled) return;
        stopPolling();
        setLoading(false);
        setError(toAppError(err));
      }
    }

    void poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  return {
    run,
    loading,
    error,
    resultsPhase,
    results,
    resultsError,
    aiPhase,
    aiAnalysis,
    aiError,
    diagnosticsPhase,
    diagnostics,
    diagnosticsError,
  };
}
