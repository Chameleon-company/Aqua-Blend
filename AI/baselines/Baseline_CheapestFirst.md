# Baseline: Cheapest-First Strategy

Task: 2: Define the cheapest-first baseline
Owner: Ali Alabdouli
Status: Safe to start
First draft due: Thursday 23 July 2026
Final draft due: Sunday 26 July 2026
Temporary submission: Analysis & AI Teams chat
Units: Volume (ML); cost_per_ML (AUD/ML); total cost values (AUD)

## 1. Description

This baseline uses the cheapest active source first, moving on to the next-cheapest source only when more water is required. It is a cost-only heuristic with no regard for water quality, so it exists to provide a simple cost-based comparison point for evaluating the MILP optimiser, rather than to represent good operational practice. This replaces the earlier, unclear name "single source."

## 2. Rule

1. Identify all active and connected sources (`sources[].source_id`, `sources[].capacity_ML`, `sources[].cost_per_ML`) for the demand zone.
2. Sort sources from lowest to highest `sources[].cost_per_ML`.
3. Before drawing from any source, validate its maximum daily withdrawal limit. `sources[].capacity_ML` is not assumed to be fully drawable in a single day: this baseline uses the separate `sources[].max_daily_withdrawal_ML` field (distinct from `capacity_ML`) as each source's usable draw limit, consistent with the project's own documented distinction between storage capacity and maximum daily withdrawal (AquaBlend MILP Configuration, Section 3, "Source capacity clarification").
4. Starting with the cheapest source, draw either its `sources[].max_daily_withdrawal_ML` or the remaining unmet demand, whichever is smaller.
5. If demand remains, move to the next-cheapest source and repeat step 4.
6. Continue until `demand_zones[].required_volume_ML` is fully met, or all active sources have reached their `sources[].max_daily_withdrawal_ML`.
7. If the total of all active sources' `sources[].max_daily_withdrawal_ML` is less than `demand_zones[].required_volume_ML`, mark the result as infeasible and report the unmet volume.
8. Tie-break rule: if two or more sources share the same `sources[].cost_per_ML`, they are ordered by ascending `sources[].source_id` (alphabetical) for reproducibility.

### Rounding rule

Rounding is not applied during intermediate steps. Source sorting and draw amounts are all calculated at full (unrounded) precision, so rounding error cannot compound as the algorithm moves through multiple sources. Volumes are rounded to one decimal place (ML) only once, at the final output stage. Percentages (`sources[].percent_of_blend`) are likewise rounded to one decimal place (%) only in the final output. This is consistent with the equal-blend baseline.

### Scope note

This rule ranks sources on `sources[].cost_per_ML` only. It does not evaluate or claim to optimise water quality (pH, alkalinity, turbidity): a cheapest-first blend may or may not pass quality constraints, and this is treated purely as a cost-comparison baseline for the optimiser.

## 3. Worked Numerical Example

Toy-model configuration used (same illustrative values as the equal-blend baseline, for direct comparison):

| `sources[].source_id` | `sources[].source_name` | `sources[].source_type` | `sources[].capacity_ML` (daily) | `sources[].max_daily_withdrawal_ML` | `sources[].cost_per_ML` (AUD/ML) |
|---|---|---|---|---|---|
| silvan_reservoir | Silvan Reservoir | reservoir | 220 | 180 | 400 |
| thomson_reservoir | Thomson Reservoir | reservoir | 260 | 230 | 380 |
| sugarloaf_reservoir | Sugarloaf Reservoir | reservoir | 150 | 120 | 420 |

Demand zone: `zone_id = zone_1`, `demand_zones[].required_volume_ML = 500`

Assumption: all three sources in this example are assumed to be active and connected to the demand zone.

Step 1: Sort by `sources[].cost_per_ML` ascending

1. Thomson (380 AUD/ML)
2. Silvan (400 AUD/ML)
3. Sugarloaf (420 AUD/ML)

Step 2: Draw from Thomson (cheapest) first

min(`max_daily_withdrawal_ML` 230, remaining demand 500) = 230 ML drawn.

Remaining demand = 500 − 230 = 270 ML.

Step 3: Move to Silvan (next-cheapest)

min(`max_daily_withdrawal_ML` 180, remaining demand 270) = 180 ML drawn.

Remaining demand = 270 − 180 = 90 ML.

Step 4: Move to Sugarloaf (most expensive)

min(`max_daily_withdrawal_ML` 120, remaining demand 90) = 90 ML drawn.

Remaining demand = 90 − 90 = 0 ML. Demand fully met.

All draw amounts above are exact at full precision; no rounding was needed until the final output table below.

Final result:

| `sources[].source_id` | Volume drawn (ML) | `sources[].percent_of_blend` | Cost contribution (AUD) |
|---|---|---|---|
| thomson_reservoir | 230.0 | 46.0% | 87,400 |
| silvan_reservoir | 180.0 | 36.0% | 72,000 |
| sugarloaf_reservoir | 90.0 | 18.0% | 37,800 |
| Total | 500.0 | 100.0% | 197,200 |

Demand supplied: 500.0 / 500 ML required → feasible, 0 ML unmet.

Comparison with the equal-blend baseline: cheapest-first totals 197,200 AUD under this rule.

Note: the equal-blend baseline's published example (199,500 AUD) does not yet apply `max_daily_withdrawal_ML` as a separate constraint from `capacity_ML`, so the two totals are not directly comparable until both baselines are reconciled to use the same withdrawal assumption. This is flagged as an open follow-up item rather than silently compared.

> Note on example values: as in the equal-blend baseline, `capacity_ML`, `max_daily_withdrawal_ML`, and `cost_per_ML` are illustrative placeholders, not the confirmed official toy-model configuration. This rule will be re-run against the official config once it becomes available.

## 4. Checklist

- [x] Sorting rule is clear (ascending `sources[].cost_per_ML`)
- [x] Capacity exhaustion is handled (move to next-cheapest source)
- [x] Maximum daily withdrawal is validated: sources are drawn up to `sources[].max_daily_withdrawal_ML`, not the higher `sources[].capacity_ML`, consistent with the project's own distinction between storage capacity and daily withdrawal
- [x] Cost ties are handled (alphabetical `sources[].source_id` tie-break)
- [x] Infeasibility is handled
- [x] Full configuration field paths are used (`sources[].source_id`, `sources[].capacity_ML`, `sources[].max_daily_withdrawal_ML`, `sources[].cost_per_ML`, `demand_zones[].required_volume_ML`, `sources[].percent_of_blend`); `Volume drawn` and `Cost contribution` are shown as plain table labels pending confirmation as Results JSON fields
- [x] A numerical example is included
- [x] Rounding rules are explained, with rounding deferred to the final output only to avoid compounding precision error
- [x] The rule does not claim to optimise water quality (see Scope note)

## 5. Deliverable

- `Baseline_CheapestFirst.md` (this document)
