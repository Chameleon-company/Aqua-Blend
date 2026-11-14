import clsx from "clsx";
import type { Run, RunState } from "@/types/run";

interface Step {
  key: string;
  label: string;
}

const NORMAL_PATH: Step[] = [
  { key: "queued", label: "Queued" },
  { key: "solving", label: "Solving" },
  { key: "analysing", label: "AI Analysis" },
  { key: "completed", label: "Completed" },
];

const INFEASIBLE_PATH: Step[] = [
  { key: "queued", label: "Queued" },
  { key: "solving", label: "Solving" },
  { key: "infeasible", label: "Infeasible" },
  { key: "diagnosing", label: "Diagnostics" },
  { key: "analysing", label: "AI Explanation" },
  { key: "completed", label: "Completed" },
];

const FAILED_PATH: Step[] = [
  { key: "queued", label: "Queued" },
  { key: "solving", label: "Solving" },
  { key: "failed", label: "Failed" },
];

/** `solved` isn't its own visible node in the simplified diagrams — it maps onto the following stage. */
function progressKey(status: RunState): string {
  if (status === "solved") return "analysing";
  return status;
}

/**
 * Visual pipeline stepper for a run.
 *   normal:      Queued -> Solving -> AI Analysis -> Completed
 *   infeasible:  Queued -> Solving -> Infeasible -> Diagnostics -> AI Explanation -> Completed
 *   failure:     Queued -> Solving -> Failed
 */
export function RunProgress({ run }: { run?: Run }) {
  if (!run) return null;

  const path = run.status === "failed" ? FAILED_PATH : run.solverOutcome === "infeasible" ? INFEASIBLE_PATH : NORMAL_PATH;
  const currentKey = progressKey(run.status);
  const currentIndex = path.findIndex((step) => step.key === currentKey);

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Run progress">
      {path.map((step, index) => {
        const isDone = currentIndex >= 0 && index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFailedStep = step.key === "failed" && isCurrent;
        const isInfeasibleStep = step.key === "infeasible" && isCurrent;
        return (
          <li key={step.key} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="text-ink-faint">&rarr;</span> : null}
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                isFailedStep && "bg-danger-soft text-danger",
                isInfeasibleStep && "bg-warning-soft text-warning",
                isCurrent && !isFailedStep && !isInfeasibleStep && "bg-primary-soft text-primary-hover",
                isDone && "bg-success-soft text-success",
                !isDone && !isCurrent && "bg-surface-sunken text-ink-faint",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
