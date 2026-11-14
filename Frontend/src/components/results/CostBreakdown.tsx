import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency } from "@/utils/formatters";
import type { CostBreakdown as CostBreakdownData } from "@/types/milp-results";

export function CostBreakdown({ cost }: { cost: CostBreakdownData }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">Reconstructed total cost</span>
          <span className="font-semibold tabular-nums text-ink">{formatCurrency(cost.reconstructedTotalCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">Solver objective value</span>
          <span className="font-semibold tabular-nums text-ink">{formatCurrency(cost.solverObjectiveValue)}</span>
        </div>
      </div>

      <div>
        {cost.costReconciles ? (
          <StatusPill label="Cost reconciles" tone="success" />
        ) : (
          <div className="flex items-start gap-2 rounded-sm border-l-2 border-danger bg-danger-soft px-3 py-2">
            <StatusPill label="Reconciliation mismatch" tone="danger" />
            <p className="text-sm text-ink">
              The reconstructed total does not match the solver objective value. Treat cost figures as provisional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
