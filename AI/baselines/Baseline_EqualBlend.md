# Baseline: Equal-Blend Strategy

Task: 1: Define the equal-blend baseline
Owner: Ali Alabdouli
Status: Safe to start
First draft due: Thursday 23 July 2026
Final draft due: Sunday 26 July 2026
Temporary submission: Analysis & AI Teams chat
Units: Volume (ML); Cost (AUD)

## 1. Description

This baseline attempts to divide the required demand equally across all active and connected sources. It exists to provide a simple comparison baseline for evaluating the MILP optimiser, giving the team a non-optimised reference point rather than an "always split evenly" claim of superiority.

## 2. Rule

1. Identify all active and connected sources (`sources[].source_id`, `sources[].capacity_ML`, `sources[].cost_per_ML`) for the demand zone.
2. Divide the zone's `demand_zones[].required_volume_ML` equally across the number of active sources.
3. For each source, compare its equal share against its `sources[].capacity_ML`.
4. If a source's equal share exceeds its `sources[].capacity_ML`, cap that source at its full `sources[].capacity_ML` and remove it from further redistribution.
5. Redistribute the remaining unmet demand equally across the remaining (uncapped) sources.
6. Repeat steps 3–5 until either all remaining demand is allocated, or no active sources with spare capacity remain.
7. If total available capacity across all active sources is less than `demand_zones[].required_volume_ML`, mark the baseline result as infeasible and report the unmet volume.

### Rounding rule

Rounding is not applied during intermediate steps. Equal-share division, capacity comparisons, and redistribution are all carried out at full (unrounded) precision, so that rounding error cannot compound across multiple redistribution iterations. Volumes are rounded to one decimal place (ML) only once, at the final output stage. Percentages (`sources[].percent_of_blend`) are likewise rounded to one decimal place (%) only in the final output.

## 3. Worked Numerical Example

Toy-model configuration used (illustrative values, see note below):

| `sources[].source_id` | `sources[].source_name` | `sources[].source_type` | `sources[].capacity_ML` (daily) | `sources[].cost_per_ML` (AUD) |
|---|---|---|---|---|
| silvan_reservoir | Silvan Reservoir | reservoir | 220 | 400 |
| thomson_reservoir | Thomson Reservoir | reservoir | 260 | 380 |
| sugarloaf_reservoir | Sugarloaf Reservoir | reservoir | 150 | 420 |

Demand zone: `zone_id = zone_1`, `demand_zones[].required_volume_ML = 500`

Assumption: all three sources in this example are assumed to be active, available, and connected to the demand zone.

Step 1: Equal share across 3 active sources
500 ÷ 3 = 166.666... ML each (full precision carried forward, not rounded).

Step 2: Capacity check
- Silvan: 220 ≥ 166.666... → OK
- Thomson: 260 ≥ 166.666... → OK
- Sugarloaf: 150 < 166.666... → exceeds capacity

Step 3: Cap Sugarloaf at its full capacity and redistribute
Sugarloaf is capped at 150 ML and removed from further redistribution.
Remaining demand = 500 − 150 = 350 ML, split equally across the 2 remaining sources: 350 ÷ 2 = 175 ML each (exact, no rounding needed at this step).

Step 4: Re-check capacity
- Silvan: 220 ≥ 175 → OK
- Thomson: 260 ≥ 175 → OK

No further exceedance. Allocation is complete. Final volumes are rounded to one decimal place only now, at output.

Final result:

| `sources[].source_id` | Volume Drawn (ML) | `sources[].percent_of_blend` | Cost Contribution (AUD) |
|---|---|---|---|
| silvan_reservoir | 175.0 | 35.0% | 70,000 |
| thomson_reservoir | 175.0 | 35.0% | 66,500 |
| sugarloaf_reservoir | 150.0 | 30.0% | 63,000 |
| Total | 500.0 | 100.0% | 199,500 |

Demand supplied: 500.0 / 500 ML required → feasible, 0 ML unmet.

> Note on example values: `capacity_ML` and `cost_per_ML` above are illustrative placeholders consistent with the toy model's documented scope (3 named Melbourne Water reservoirs, reservoirs treated as lowest-cost tier). They are not the confirmed official toy-model configuration values. These will be replaced with the real confirmed figures once the official config becomes available.

## 4. Checklist

- [x] Rule is clear enough to code directly
- [x] Only active and connected sources are included, with this assumption stated for the worked example
- [x] Source capacity is never exceeded
- [x] Remaining demand is redistributed correctly
- [x] Infeasibility case is explained (Step 7)
- [x] Full configuration field paths are used (`sources[].source_id`, `sources[].capacity_ML`, `sources[].cost_per_ML`, `demand_zones[].required_volume_ML`, `sources[].percent_of_blend`); `volume_drawn_ML` and `cost_contribution` are shown as plain table labels pending confirmation as Results JSON fields
- [x] A small numerical example is included
- [x] Rounding rules are explained, with rounding deferred to the final output only to avoid compounding precision error

## 5. Deliverable

- `Baseline_EqualBlend.md` (this document)
