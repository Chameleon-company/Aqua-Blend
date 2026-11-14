import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatSolveTime } from "@/utils/formatters";
import { getRunStatusMeta } from "@/utils/resultStatus";

export interface RunStatusProps {
  status?: string | null;
  runId?: string | null;
  scenarioId?: string | null;
  scenarioName?: string | null;
  progressMessage?: string | null;
  objectiveValue?: number | null;
  solveTimeMs?: number | null;
  loading?: boolean;
}

/**
 * Horizontal status strip shown at the top of the run tracking page.
 *
 * Accepts plain scalar props (not a bound `Run`/`RunDto` object) so it works
 * identically whether the caller has the old mock-pipeline `Run` type or the
 * real backend's `RunDto` — the only real contract is "some status string,
 * possibly one this frontend build doesn't recognise yet". getRunStatusMeta
 * is fully defensive, so this component can never throw on an unknown status
 * (AquaBlend_Frontend_Final_Integration_Implementation.md §3).
 */
export function RunStatus({
  status,
  runId,
  scenarioId,
  scenarioName,
  progressMessage,
  objectiveValue,
  solveTimeMs,
  loading,
}: RunStatusProps) {
  const pill = loading ? { label: "Loading", tone: "neutral" as const } : getRunStatusMeta(status);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-sm border border-border bg-surface-alt px-5 py-4"
    >
      <StatusPill label={pill.label} tone={pill.tone} />

      {scenarioId ? (
        <div className="text-sm">
          <span className="text-ink-faint">Scenario</span>{" "}
          <span className="font-medium text-ink">{scenarioName ?? scenarioId}</span>
        </div>
      ) : null}

      {runId ? (
        <div className="text-sm">
          <span className="text-ink-faint">Run ID</span> <span className="font-mono text-ink">{runId}</span>
        </div>
      ) : null}

      {!loading && pill.description ? <p className="text-sm text-ink-muted">{pill.description}</p> : null}

      {progressMessage ? <p className="text-sm text-ink-muted">{progressMessage}</p> : null}

      {objectiveValue !== undefined && objectiveValue !== null ? (
        <div className="text-sm">
          <span className="text-ink-faint">Objective</span>{" "}
          <span className="font-medium text-ink">{formatCurrency(objectiveValue)}</span>
        </div>
      ) : null}

      {solveTimeMs !== undefined && solveTimeMs !== null ? (
        <div className="text-sm">
          <span className="text-ink-faint">Solve time</span>{" "}
          <span className="font-medium text-ink">{formatSolveTime(solveTimeMs)}</span>
        </div>
      ) : null}
    </div>
  );
}
