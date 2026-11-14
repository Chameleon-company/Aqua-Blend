import { formatCurrency, formatPercent } from "@/utils/formatters";
import { COST_CATEGORY_COLORS } from "@/utils/chartColors";
import type { CostBreakdown } from "@/types/milp-results";

/** Where is cost coming from? One 100%-width bar segmented by fixed, named cost categories. */
export function CostBreakdownChart({ cost }: { cost: CostBreakdown }) {
  const segments = [
    { label: "Source fixed cost", value: cost.totalSourceFixedCost, color: COST_CATEGORY_COLORS.sourceFixed },
    { label: "Source withdrawal cost", value: cost.totalSourceWithdrawalCost, color: COST_CATEGORY_COLORS.sourceWithdrawal },
    { label: "Plant fixed cost", value: cost.totalPlantFixedCost, color: COST_CATEGORY_COLORS.plantFixed },
    { label: "Plant treatment cost", value: cost.totalPlantTreatmentCost, color: COST_CATEGORY_COLORS.plantTreatment },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label="Cost breakdown by category">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
              title={`${s.label}: ${formatCurrency(s.value)}`}
            />
          ))}
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate text-ink-muted">{s.label}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="font-medium tabular-nums text-ink">{formatCurrency(s.value)}</span>
              <span className="ml-1.5 text-xs tabular-nums text-ink-faint">{formatPercent(total > 0 ? s.value / total : 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
