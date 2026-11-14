import { FailedState } from "@/components/states/FailedState";
import type { RunDto } from "@/types/run";

export interface RunErrorStateProps {
  run: RunDto;
}

/**
 * `workflowStatus === "failed"` only — a genuine infrastructure/solver
 * failure, never used for a mathematically infeasible-but-valid MILP result
 * (that is InfeasibleState, driven by milpOutput.solverIsFeasible === false;
 * see AquaBlend_Frontend_Final_Integration_Implementation.md §16).
 */
export function RunErrorState({ run }: RunErrorStateProps) {
  return (
    <FailedState
      message={run.error ?? "This run could not be executed."}
      detail={run.progressMessage ?? undefined}
    />
  );
}
