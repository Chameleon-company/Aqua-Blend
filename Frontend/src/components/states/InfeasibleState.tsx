import type { RunWarning } from "@/types/milp-results";
import { WarningList } from "@/components/results/WarningList";

export interface InfeasibleStateProps {
  scenarioId: string;
  resultId?: string;
  feasibilityState?: string;
  warnings?: RunWarning[];
}

/** layout.md §17.6 — no fake zero-valued result tables, just the deterministic evidence available. */
export function InfeasibleState({ scenarioId, resultId, feasibilityState, warnings }: InfeasibleStateProps) {
  return (
    <div role="status" className="border border-warning-soft bg-warning-soft/60 rounded-sm p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-warning">No feasible solution</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">This scenario could not be solved</h2>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm text-ink-muted">
        <div>
          <dt className="inline font-medium text-ink">Scenario: </dt>
          <dd className="inline">{scenarioId}</dd>
        </div>
        {resultId ? (
          <div>
            <dt className="inline font-medium text-ink">Result ID: </dt>
            <dd className="inline">{resultId}</dd>
          </div>
        ) : null}
      </dl>
      {feasibilityState ? <p className="mt-4 text-sm text-ink">{feasibilityState}</p> : null}
      {warnings && warnings.length > 0 ? (
        <div className="mt-4">
          <WarningList warnings={warnings} />
        </div>
      ) : null}
      <p className="mt-4 text-sm text-ink-muted">
        Try relaxing demand requirements, expanding source availability, or adjusting the scenario, then run the
        optimisation again.
      </p>
    </div>
  );
}
