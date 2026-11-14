import clsx from "clsx";
import { Check, X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatSolveTime } from "@/utils/formatters";
import { getRunProgressInfo, getRunStatusMeta, RUN_PROGRESS_STAGES, type RunProgressInfo } from "@/utils/resultStatus";

export interface RunWorkflowProgressProps {
  status?: string | null;
  progressMessage?: string | null;
  milpStartedAt?: string | null;
  milpCompletedAt?: string | null;
  scenarioId?: string | null;
  scenarioName?: string | null;
  runId?: string | null;
  objectiveValue?: number | null;
  solveTimeMs?: number | null;
}

type StepVisualState = "done" | "current" | "upcoming" | "failed" | "warning";

/**
 * completed_with_ai_error keeps "Complete" checked (the run IS terminal) and
 * marks only "Analysing" with a warning, matching Part 17's example
 * (`✓ Optimising / ! Analysing / ✓ Complete with warning`) rather than
 * recolouring the final step.
 */
function stepStateForIndex(index: number, info: RunProgressInfo): StepVisualState {
  if (info.isFailed) {
    if (info.stageIndex < 0) return "upcoming";
    if (index < info.stageIndex) return "done";
    if (index === info.stageIndex) return "failed";
    return "upcoming";
  }
  if (info.isAiWarning) {
    if (index < 3) return "done";
    if (index === 3) return "warning";
    return "done";
  }
  if (index < info.stageIndex) return "done";
  if (index === info.stageIndex) {
    // The final "Complete" stage is binary (reached or not) — once the run
    // is there it is fully done, never merely "in progress" (Part 31: a
    // completed run shows all five steps checked, no active pointer left).
    return index === RUN_PROGRESS_STAGES.length - 1 ? "done" : "current";
  }
  return "upcoming";
}

const CIRCLE_STYLES: Record<StepVisualState, string> = {
  done: "bg-success text-white",
  current: "bg-primary text-white",
  upcoming: "bg-surface-sunken text-ink-faint border border-border",
  failed: "bg-danger text-white",
  warning: "bg-warning text-white",
};

const LABEL_STYLES: Record<StepVisualState, string> = {
  done: "text-ink",
  current: "text-ink",
  upcoming: "text-ink-faint",
  failed: "text-danger",
  warning: "text-warning",
};

const SR_STATE_TEXT: Record<StepVisualState, string> = {
  done: "completed",
  current: "current step",
  upcoming: "not started yet",
  failed: "failed",
  warning: "completed with a warning",
};

function MetaRow({
  scenarioId,
  scenarioName,
  runId,
  objectiveValue,
  solveTimeMs,
}: Pick<RunWorkflowProgressProps, "scenarioId" | "scenarioName" | "runId" | "objectiveValue" | "solveTimeMs">) {
  if (!scenarioId && !runId && objectiveValue == null && solveTimeMs == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
      {scenarioId ? (
        <div>
          <span className="text-ink-faint">Scenario</span> <span className="font-medium text-ink">{scenarioName ?? scenarioId}</span>
        </div>
      ) : null}
      {runId ? (
        <div>
          <span className="text-ink-faint">Run ID</span> <span className="font-mono text-ink">{runId}</span>
        </div>
      ) : null}
      {objectiveValue !== undefined && objectiveValue !== null ? (
        <div>
          <span className="text-ink-faint">Objective</span> <span className="font-medium text-ink">{formatCurrency(objectiveValue)}</span>
        </div>
      ) : null}
      {solveTimeMs !== undefined && solveTimeMs !== null ? (
        <div>
          <span className="text-ink-faint">Solve time</span> <span className="font-medium text-ink">{formatSolveTime(solveTimeMs)}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal run-progress stepper (replaces the old changing status pill as
 * the primary presentation — AquaBlend run-tracking redesign). Driven
 * entirely by `run.workflowStatus` via the single getRunProgressInfo mapping
 * (Part 28); an unrecognised future status degrades to a plain status pill
 * instead of drawing a broken/empty stepper.
 */
export function RunWorkflowProgress({
  status,
  progressMessage,
  milpStartedAt,
  milpCompletedAt,
  scenarioId,
  scenarioName,
  runId,
  objectiveValue,
  solveTimeMs,
}: RunWorkflowProgressProps) {
  const info = getRunProgressInfo(status, { milpStartedAt, milpCompletedAt });

  if (!info.recognised) {
    const meta = getRunStatusMeta(status);
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-sm border border-border bg-surface-alt px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label={meta.label} tone={meta.tone} />
          {meta.description ? <p className="text-sm text-ink-muted">{meta.description}</p> : null}
        </div>
        {progressMessage ? <p className="text-sm text-ink-muted">{progressMessage}</p> : null}
        <MetaRow scenarioId={scenarioId} scenarioName={scenarioName} runId={runId} objectiveValue={objectiveValue} solveTimeMs={solveTimeMs} />
      </div>
    );
  }

  const sentence = progressMessage?.trim() || info.sentence;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border bg-surface-alt px-5 py-5">
      <ol className="grid grid-cols-5 gap-1" aria-label="Run progress">
        {RUN_PROGRESS_STAGES.map((stage, index) => {
          const state = stepStateForIndex(index, info);
          return (
            <li key={stage.key} className="relative flex flex-col items-center gap-2 px-1 text-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2",
                    state === "failed" ? "bg-danger" : state === "upcoming" ? "bg-border-strong" : "bg-success",
                  )}
                />
              ) : null}
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={clsx(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  CIRCLE_STYLES[state],
                )}
              >
                {state === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                {state === "failed" ? <X className="h-4 w-4" aria-hidden="true" /> : null}
                {state === "warning" ? <span aria-hidden="true">!</span> : null}
                {state === "current" || state === "upcoming" ? <span aria-hidden="true">{index + 1}</span> : null}
              </span>
              <span className={clsx("text-xs font-medium leading-tight break-words", LABEL_STYLES[state])}>
                {stage.label}
                <span className="sr-only"> ({SR_STATE_TEXT[state]})</span>
              </span>
            </li>
          );
        })}
      </ol>

      <p role="status" aria-live="polite" className="text-sm text-ink-muted">
        {sentence}
      </p>

      <MetaRow scenarioId={scenarioId} scenarioName={scenarioName} runId={runId} objectiveValue={objectiveValue} solveTimeMs={solveTimeMs} />
    </div>
  );
}
