import type { RunState, RunWorkflowStatus, SolverOutcome } from "@/types/run";
import type { AIAnalysisStatus } from "@/types/ai-analysis";
import type { DiagnosticsStatus } from "@/types/diagnostics";
import type { ScenarioStatus } from "@/types/scenario";
import type { StressTestState } from "@/types/stress-test";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  description?: string;
}

/**
 * Mock-only pipeline stage (services/mock/mockClient.ts's simulated
 * queued -> solving -> solved/infeasible -> diagnosing -> analysing ->
 * completed sequence). Kept for the mock adapter's backward compatibility;
 * the real backend never returns these values — see RUN_WORKFLOW_STATUS_META
 * below for the actual contract.
 */
export const RUN_STATE_META: Record<RunState, StatusMeta> = {
  queued: { label: "Queued", tone: "neutral" },
  solving: { label: "Solving", tone: "info" },
  solved: { label: "Solved", tone: "success" },
  infeasible: { label: "Infeasible", tone: "warning" },
  diagnosing: { label: "Diagnosing", tone: "info" },
  analysing: { label: "AI Analysis", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

/**
 * The real backend's Run.status vocabulary (Backend/Domain/
 * RunWorkflowStatuses.cs) — the single source of truth for how each
 * workflow status is labelled/coloured. `milp_completed` is deliberately
 * "info" tone (not "success") because AI analysis may still be pending.
 */
export const RUN_WORKFLOW_STATUS_META: Record<RunWorkflowStatus, StatusMeta> = {
  queued: {
    label: "Queued",
    tone: "neutral",
    description: "Waiting for optimisation processing.",
  },
  preparing_input: {
    label: "Preparing Input",
    tone: "info",
    description: "Resolving source data and constructing model parameters.",
  },
  milp_running: {
    label: "Optimising",
    tone: "info",
    description: "The MILP solver is running.",
  },
  milp_completed: {
    label: "MILP Complete",
    tone: "info",
    description: "Optimisation finished. AI analysis may still be pending.",
  },
  ai_queued: {
    label: "AI Queued",
    tone: "info",
    description: "AI analysis is queued.",
  },
  ai_running: {
    label: "AI Analysing",
    tone: "info",
    description: "AI analysis is in progress.",
  },
  completed: {
    label: "Completed",
    tone: "success",
    description: "Optimisation and AI analysis both completed.",
  },
  completed_with_ai_error: {
    label: "Completed (AI Error)",
    tone: "warning",
    description: "Optimisation completed successfully, but AI analysis could not be completed.",
  },
  failed: {
    label: "Failed",
    tone: "danger",
    description: "The run could not be executed.",
  },
};

/**
 * Single defensive source of truth for rendering ANY run status string —
 * real backend workflow statuses, the mock's legacy pipeline stages, or a
 * genuinely unrecognised future value. This must never throw: it is what
 * fixes the "Cannot read properties of undefined (reading 'label')" crash
 * (AquaBlend_Frontend_Final_Integration_Implementation.md §3) that occurred
 * when a real "queued"/"preparing_input"/etc. status reached the old direct
 * `RUN_STATE_META[state]` lookup, which had no entry for it.
 */
export function getRunStatusMeta(status?: string | null): StatusMeta {
  const key = status?.trim().toLowerCase();

  if (key && key in RUN_WORKFLOW_STATUS_META) {
    return RUN_WORKFLOW_STATUS_META[key as RunWorkflowStatus];
  }
  if (key && key in RUN_STATE_META) {
    return RUN_STATE_META[key as RunState];
  }

  return {
    label: status && status.trim() ? status.trim() : "Unknown",
    tone: "neutral",
    description: "This run status is not recognised by this frontend version.",
  };
}

/** Alias matching the exact name used in the implementation brief. */
export const getRunWorkflowStatusMeta = getRunStatusMeta;

/**
 * User-facing run-progress stepper (layout.md / run tracking UX). The nine
 * backend workflow statuses are grouped into five stable stages so the
 * stepper never grows/shrinks or reorders as the run advances — only the
 * "current" pointer and per-step visual state move.
 */
export type RunProgressStageKey = "queued" | "preparing" | "optimising" | "analysing" | "complete";

export interface RunProgressStageDef {
  key: RunProgressStageKey;
  label: string;
}

export const RUN_PROGRESS_STAGES: readonly RunProgressStageDef[] = [
  { key: "queued", label: "Queued" },
  { key: "preparing", label: "Preparing" },
  { key: "optimising", label: "Optimising" },
  { key: "analysing", label: "Analysing" },
  { key: "complete", label: "Complete" },
];

export interface RunProgressInfo {
  /** True only when `status` is one of the 9 canonical RunWorkflowStatus values. */
  recognised: boolean;
  /** Index into RUN_PROGRESS_STAGES occupied by this status; -1 when unrecognised. */
  stageIndex: number;
  /** One concise sentence describing what is happening right now (Part 16). */
  sentence: string;
  /** True only for the genuine terminal `failed` workflow status. */
  isFailed: boolean;
  /** True only for `completed_with_ai_error`: MILP succeeded, AI analysis did not. */
  isAiWarning: boolean;
}

interface RunProgressDef {
  stageIndex: number;
  sentence: string;
  isFailed?: boolean;
  isAiWarning?: boolean;
}

/**
 * `milp_completed` shares stageIndex 3 (Analysing) with `ai_queued`/
 * `ai_running` rather than lingering on "Optimising" — the optimisation
 * itself is already done at that point (the Optimising step renders as
 * "done", not "current"; see stepStateForIndex in RunWorkflowProgress.tsx),
 * and the run is already transitioning toward analysis. Only the sentence
 * text distinguishes the three sub-states, per Part 16/28's requirement of
 * one single mapping table (not scattered per-component switches).
 */
const RUN_WORKFLOW_PROGRESS: Record<RunWorkflowStatus, RunProgressDef> = {
  queued: { stageIndex: 0, sentence: "Your run is waiting to start." },
  preparing_input: { stageIndex: 1, sentence: "Preparing and validating optimisation inputs." },
  milp_running: { stageIndex: 2, sentence: "Optimising the scenario." },
  milp_completed: { stageIndex: 3, sentence: "Optimisation complete. Preparing analysis." },
  ai_queued: { stageIndex: 3, sentence: "Optimisation complete. Analysis is queued." },
  ai_running: { stageIndex: 3, sentence: "Analysing the optimisation result." },
  completed: { stageIndex: 4, sentence: "Optimisation and analysis completed." },
  completed_with_ai_error: {
    stageIndex: 4,
    sentence: "Optimisation completed, but the analysis layer encountered a problem.",
    isAiWarning: true,
  },
  failed: { stageIndex: -1, sentence: "The run could not be completed.", isFailed: true },
};

/**
 * Resolves a backend workflow status to the stepper's current stage plus a
 * status sentence. Never throws — an unrecognised status (a future backend
 * value this build doesn't know about yet) comes back with
 * `recognised: false` so the caller can fall back to a plain status pill
 * instead of drawing a broken/empty stepper (Part 28).
 *
 * `failed` does not carry its own stage — the backend only ever reports one
 * combined `failed` status regardless of which pre-analysis phase raised it
 * (the AI worker reports its own failures as `completed_with_ai_error`, never
 * `failed` — see Aqua-Blend-Analysis-Ai/AI/ai_worker.py's fail_ai). The
 * milpStartedAt/milpCompletedAt timestamps already on RunDto (not invented
 * data) give a reasonable best-effort marker of how far the run got before
 * failing, without claiming precision the backend does not report.
 */
export function getRunProgressInfo(
  status?: string | null,
  context?: { milpStartedAt?: string | null; milpCompletedAt?: string | null },
): RunProgressInfo {
  const key = status?.trim().toLowerCase();
  const def = key && key in RUN_WORKFLOW_PROGRESS ? RUN_WORKFLOW_PROGRESS[key as RunWorkflowStatus] : null;

  if (!def) {
    return { recognised: false, stageIndex: -1, sentence: "", isFailed: false, isAiWarning: false };
  }

  let stageIndex = def.stageIndex;
  if (def.isFailed) {
    if (context?.milpCompletedAt) stageIndex = 3;
    else if (context?.milpStartedAt) stageIndex = 2;
    else stageIndex = 1;
  }

  return {
    recognised: true,
    stageIndex,
    sentence: def.sentence,
    isFailed: !!def.isFailed,
    isAiWarning: !!def.isAiWarning,
  };
}

/**
 * @deprecated Kept only so existing callers keep compiling; delegates to the
 * defensive getRunStatusMeta so it can never throw for an unrecognised value
 * (this used to be an unguarded `RUN_STATE_META[state]` lookup, which is
 * exactly what crashed RunStatus.tsx on a real backend workflow status).
 */
export function getRunStateMeta(state: string): StatusMeta {
  return getRunStatusMeta(state);
}

export const SOLVER_OUTCOME_META: Record<SolverOutcome, StatusMeta> = {
  optimal: { label: "Optimal", tone: "success" },
  infeasible: { label: "Infeasible", tone: "danger" },
};

export const SCENARIO_STATUS_META: Record<ScenarioStatus, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "Ready", tone: "success" },
  invalid: { label: "Not Ready", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
};

export function getScenarioStatusMeta(status: ScenarioStatus): StatusMeta {
  return SCENARIO_STATUS_META[status];
}

export const AI_ANALYSIS_STATE_META: Record<AIAnalysisStatus, StatusMeta> = {
  ready: { label: "Ready", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  unavailable: { label: "Unavailable", tone: "neutral" },
};

export const DIAGNOSTICS_STATE_META: Record<DiagnosticsStatus, StatusMeta> = {
  ready: { label: "Ready", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  unavailable: { label: "Unavailable", tone: "neutral" },
};

export const STRESS_TEST_STATE_META: Record<StressTestState, StatusMeta> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};
