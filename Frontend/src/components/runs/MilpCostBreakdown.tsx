import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency } from "@/utils/formatters";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpCostBreakdownProps {
  output: MilpModelOutputDto;
}

/**
 * Cost Breakdown (AquaBlend_Frontend_Final_Integration_Implementation.md
 * §15). Cost fields render "Not available" (via formatCurrency's null
 * handling) rather than $0 when the model is infeasible and never priced a
 * solution — a $0 total would misleadingly imply a free, valid solution.
 */
export function MilpCostBreakdown({ output }: MilpCostBreakdownProps) {
  const rows: { label: string; value: number | null }[] = [
    { label: "Source fixed cost", value: output.totalSourceFixedCost },
    { label: "Source variable cost", value: output.totalSourceVariableCost },
    { label: "Plant fixed cost", value: output.totalPlantFixedCost },
    { label: "Plant variable cost", value: output.totalPlantVariableCost },
    { label: "Reconstructed total cost", value: output.reconstructedTotalCost },
    { label: "Total cost", value: output.totalCost },
  ];

  return (
    <Card>
      <CardHeader title="Cost Breakdown" />
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between">
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="font-semibold tabular-nums text-ink">{formatCurrency(row.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        {output.costReconciles === null ? null : output.costReconciles ? (
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
    </Card>
  );
}
