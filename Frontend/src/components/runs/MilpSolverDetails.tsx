import { Card } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { formatSolveTime, MISSING_VALUE } from "@/utils/formatters";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpSolverDetailsProps {
  output: MilpModelOutputDto;
}

/**
 * Solver Details (AquaBlend_Frontend_Final_Integration_Implementation.md
 * §21) — secondary/expandable technical section. Hashes are for audit, not
 * the primary experience, so this stays collapsed by default.
 */
export function MilpSolverDetails({ output }: MilpSolverDetailsProps) {
  const rows: { label: string; value: string }[] = [
    { label: "Solver name", value: output.solverName ?? MISSING_VALUE },
    { label: "Solver version", value: output.solverVersion ?? MISSING_VALUE },
    { label: "Solver status", value: output.solverStatus ?? MISSING_VALUE },
    { label: "Termination condition", value: output.solverTerminationCondition ?? MISSING_VALUE },
    { label: "Solver message", value: output.solverMessage ?? MISSING_VALUE },
    { label: "Solve time", value: formatSolveTime(output.solveTimeMs) },
    { label: "MILP model version", value: output.milpModelVersion ?? MISSING_VALUE },
    { label: "Input hash", value: output.inputHash ?? MISSING_VALUE },
    { label: "Model parameters hash", value: output.modelParametersHash ?? MISSING_VALUE },
    { label: "Execution key", value: output.executionKey ?? MISSING_VALUE },
    { label: "Output hash", value: output.outputHash ?? MISSING_VALUE },
  ];

  return (
    <Card padding="sm">
      <Collapsible summary="Solver Details (technical)">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-ink-faint">{row.label}</dt>
              <dd className="font-mono text-xs text-ink text-right break-all">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Collapsible summary="View raw MILP output">
            <pre className="max-h-96 overflow-auto rounded-sm bg-surface-sunken p-3 text-xs">
              {JSON.stringify(output.rawOutputJson, null, 2)}
            </pre>
          </Collapsible>
        </div>
      </Collapsible>
    </Card>
  );
}
