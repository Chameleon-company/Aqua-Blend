# Task 38: hard-coded explanation template fallback

**Backlog task:** 38 (AI stream, T3 2026). The backlog note says this must be the only hard-coded template task, so all fixed explanation wording for AquaBlend lives in one file here.
**Depends on:** Task 45, the MILP output agreement (`AI/milp_output_agreement`)

One script, `fill_template.py`, fills the placeholders in `explanation_template.json` with figures from a scenario input and its MILP output. It is the fallback when an LLM explanation (Tasks 46 to 48) is not available or fails checks.

## Where each figure comes from

| From the MILP output (`raw_output_json`) | From the scenario input |
|---|---|
| Solver status, totals, costs, per-source withdrawal, blend share and utilisation, plant throughput, zone deliveries and shortfall, inflow quality values and whether they are within limits, binding-constraint sentences | Scenario, source, plant and zone names; demand per zone (missing from the output, gap G6); quality limits in reporting units, e.g. pH 6.5 to 8.5 (the output only has hydrogen-ion limits, gap G12); whether chemical dosing is on |

Every MILP output field is read through `is_presentable()` from the Task 45 agreement. If the template asks for a field the agreement does not allow in that mode, filling stops with an error instead of printing it. On a run with no solution, only the solver status, total demand and counts are used, so the zero-filled costs and flows never appear.

## Templates

`explanation_template.json` has one template per gate mode:

- `VALID`: headline, then sections for sources, plants, demand zones, costs, inflow quality and constraints at their limits, then notes (no currency; quality is before treatment; dosing off when the scenario says so). The headline says "optimal" only when the solver proved it.
- `NO_SOLUTION`: says no valid solution was found, gives the solver result, total demand and counts, explains why no figures are shown, and lists any sources excluded before solving.
- `INVALID_OUTPUT`: says the run failed its consistency checks and shows no figures.

To change wording, edit the JSON. Placeholders are `{names}`; an unknown placeholder is an error, never printed as `{braces}`.

Numbers are shown with up to 2 decimals, no trailing zeros, and thousands separators (`533,000`, `58.33`). Blend share is the only calculated display value (`blend_ratio` × 100). The binding-constraint sentences are quoted exactly as the MILP produces them, so they use IDs rather than names.

## Running it

```zsh
cd AI/explanation_template
python fill_template.py --scenario ../../MILP/config/scenarios/base_scenarios_v1.json \
    --output ../milp_output_agreement/fixtures/feasible.json

# structured version with the same fields as the Task 46 LLM report
python fill_template.py --scenario ../../MILP/config/scenarios/base_scenarios_v1.json \
    --output ../milp_output_agreement/fixtures/infeasible.json --json
```

Example output for the feasible fixture (abridged):

```
# Aqua Blend Base Scenarios V1: blending result

The optimal blend for Aqua Blend Base Scenarios V1 delivers 1,200 ML/day against a demand of 1,200 ML/day, at a total cost of 533,000.

## Sources (3 of 3 used)

- Thomson Reservoir (225103): 700 ML/day, 58.33% of the blend, 100% of its maximum withdrawal
- O'Shannassy Reservoir (229421): 300 ML/day, 25% of the blend, 100% of its maximum withdrawal
- Barwon River at Geelong (233217): 200 ML/day, 16.67% of the blend, 29.41% of its maximum withdrawal
...
## Blended water entering Toy Treatment Plant, before treatment

- pH: 7.09 (limits 6.5 to 8.5), within limits
...
```

## Tests

```zsh
cd AI
python -m pytest explanation_template -q
```

21 tests on the real Task 45 fixtures and `MILP/config/scenarios/base_scenarios_v1.json`. They check the exact wording for each mode, that pH limits come from the scenario, that no figure appears on a run with no solution, the not-optimal, shortfall and outside-limits wording, fallback to IDs when names are missing, and that the template cannot use a forbidden field or an unknown placeholder. One test pulls every number out of the filled text and fails if any of them is not an allowed output value or a scenario value. Passes on Python 3.9 and 3.13.

## Limits

- Tested on the base scenario only: one plant, one zone, three sources.
- The scenario file format is the MILP's (`MILP/config/scenarios`). If the app stores scenarios in a different shape, `ScenarioReader` is the one place to change.
- Wording is English only.
