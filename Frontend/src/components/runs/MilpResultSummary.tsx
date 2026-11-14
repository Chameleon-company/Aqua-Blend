import { Card } from "@/components/ui/Card";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatMlPerDay, formatNumber, formatSolveTime, MISSING_VALUE } from "@/utils/formatters";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpResultSummaryProps {
  output: MilpModelOutputDto;
}

/**
 * Optimisation Summary (AquaBlend_Frontend_Final_Integration_Implementation.md
 * §14) — prefers the backend's flattened fields over rawOutputJson. Every
 * value is rendered through the shared formatters, so a missing value always
 * reads "Not available" rather than `NaN`/`undefined`/`0`. No heading here:
 * the enclosing Section (src/app/runs/[runId]/page.tsx) already provides the
 * "Optimisation Summary" title, so this only adds the status pills.
 */
export function MilpResultSummary({ output }: MilpResultSummaryProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {output.solverStatus ? <StatusPill label={output.solverStatus} tone="neutral" /> : null}
        {output.solverIsOptimal ? <StatusPill label="Optimal" tone="success" /> : null}
      </div>
      <KpiGrid>
        <KpiCard label="Solve Time" value={formatSolveTime(output.solveTimeMs)} />
        <KpiCard label="Objective Value" value={formatCurrency(output.solverObjectiveValue)} />
        <KpiCard label="Selected Sources" value={output.selectedSourceCount ?? MISSING_VALUE} />
        <KpiCard label="Active Plants" value={output.activePlantCount ?? MISSING_VALUE} />
        <KpiCard label="Total Demand" value={formatMlPerDay(output.totalDemandMlPerDay)} />
        <KpiCard label="Total Withdrawal" value={formatMlPerDay(output.totalWithdrawalMlPerDay)} />
        <KpiCard label="Total Treated" value={formatMlPerDay(output.totalTreatedMlPerDay)} />
        <KpiCard label="Total Delivered" value={formatMlPerDay(output.totalDeliveredMlPerDay)} />
        <KpiCard label="Total Cost" value={formatCurrency(output.totalCost)} />
      </KpiGrid>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-ink-faint">
        <div>
          <dt className="inline">Feasible: </dt>
          <dd className="inline">{output.solverIsFeasible === null ? MISSING_VALUE : output.solverIsFeasible ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="inline">Optimal: </dt>
          <dd className="inline">{output.solverIsOptimal === null ? MISSING_VALUE : output.solverIsOptimal ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="inline">Solver objective value: </dt>
          <dd className="inline">{formatNumber(output.solverObjectiveValue)}</dd>
        </div>
      </dl>
    </Card>
  );
}
