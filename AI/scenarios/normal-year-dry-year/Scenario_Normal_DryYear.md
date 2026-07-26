# AquaBlend Normal-Year and Dry-Year Toy Scenarios

**Task:** Task 10 — Define the normal-year and dry-year scenarios  
**Owner:** Amantha Kulathunga
**Team:** Analysis & AI, Sprint 1 
**Status:** Draft using provisional toy model values  
**Units:** Volume in ML. Changes in %

---

## 1. Purpose

This document defines two reproducible input scenarios for testing the AquaBlend MILP model:

1. **Normal-year toy scenario** — an unchanged copy of the provisional toy reference configuration.
2. **Dry-year toy scenario** — the same configuration with one clearly defined reduction to reservoir supply capacity.

The scenarios use dummy values because the official input configuration is not available as of yet. They are intended for model development and comparison only and must not be treated as operational water supply recommendations.

---

## 2. Files

| File | Purpose |
|---|---|
| `scenario_normal_toy.json` | Unchanged provisional reference configuration |
| `scenario_dry_toy.json` | Dry-year copy with reduced reservoir capacity_ML values |
| `Scenario_Normal_DryYear.md` | Documents the scenario assumptions, changes, calculations and feasibility checks |

---

## 3. Normal-Year Toy Scenario

The normal-year scenario is an unchanged copy of the provisional toy reference configuration.

It contains:

- Three reservoir sources: Silvan Reservoir, Thomson Reservoir and Sugarloaf Reservoir
- One treatment facility
- One demand zone
- A required demand of **500 ML**
- A total available source capacity of **950 ML**

No source cost, water quality value, treatment setting, demand value or constraint is changed in the normal-year scenario.

### Normal-year capacities

| Source | Source type | Field | Capacity |
|---|---|---|---:|
| Silvan Reservoir | Reservoir | `capacity_ML` | 300 ML |
| Thomson Reservoir | Reservoir | `capacity_ML` | 400 ML |
| Sugarloaf Reservoir | Reservoir | `capacity_ML` | 250 ML |
| **Total** |  |  | **950 ML** |

---

## 4. Dry-Year Scenario Definition

### Dry-year change

The dry-year scenario applies a **20% reduction** to the `capacity_ML` value of all three reservoir sources.

All three sources are reduced by the same percentage because they are all represented as the same source type (reservoirs) in this toy configuration. No river, groundwater, recycled water or desalination source is included in the current toy model.

The following fields remain unchanged:

- `cost_per_ML`
- `pH`
- `alkalinity`
- `turbidity`
- Treatment-facility settings
- Demand-zone requirements
- Quality constraints
- Solver configuration

### Justification

The Victorian Government states that, during drought, water storage levels can fall by up to **20% in a single year**. This figure is used as a simple and reproducible stress test assumption for the provisional toy scenario.

The source refers to storage levels rather than confirmed daily withdrawal capacity. Therefore, the 20% reduction is being used as a proxy for reduced available supply in the dummy model, not as an operational estimate for the actual daily capacity of Silvan, Thomson or Sugarloaf reservoirs.

**Source:** [Victorian Government — Desalination water order](https://www.water.vic.gov.au/about-us/news/news-stories/desalination-water-order)

---

## 5. Capacity Changes

The dry-year capacity is calculated as:

Dry-year capacity = Normal capacity × (1 - 20/100)
                  = Normal capacity × 0.80


| Source | Source type | Changed field | Normal-year value | Dry-year value | Reduction |
|---|---|---|---:|---:|---:|
| Silvan Reservoir | Reservoir | `capacity_ML` | 300 ML | 240 ML | 20% |
| Thomson Reservoir | Reservoir | `capacity_ML` | 400 ML | 320 ML | 20% |
| Sugarloaf Reservoir | Reservoir | `capacity_ML` | 250 ML | 200 ML | 20% |
| **Total** |  |  | **950 ML** | **760 ML** | **20%** |

### Individual calculations

Silvan Reservoir:
300 ML × 0.80 = 240 ML

Thomson Reservoir:
400 ML × 0.80 = 320 ML

Sugarloaf Reservoir:
250 ML × 0.80 = 200 ML


---

## 6. Remaining Capacity Check

The 500 ML demand is a provisional dummy value adapted from the illustrative Section 8 output example of the Aquablend MILP Configuration. It is not a confirmed operational or official toy-model demand value.

### Normal year

Total normal capacity = 300 + 400 + 250
                      = 950 ML

Normal capacity margin = Total capacity - Demand
                       = 950 - 500
                       = 450 ML


### Dry year

Total dry-year capacity = 240 + 320 + 200
                        = 760 ML

Dry-year capacity margin = Total capacity - Demand
                         = 760 - 500
                         = 260 ML


The dry-year scenario retains **760 ML** of total source capacity against a demand of **500 ML**. It therefore passes the basic total capacity feasibility check, with a remaining capacity margin of **260 ML**.

---

## 7. Possible Infeasibility

The capacity check does not guarantee that the MILP will find a feasible solution.

The dry-year scenario could still become infeasible if:

- The available source blend cannot satisfy the pH constraint
- The available source blend cannot satisfy alkalinity or turbidity limits
- The treatment facility cannot process the required volume
- Treatment batch requirements cannot be satisfied
- Activation or connectivity constraints prevent the required sources from being used

The scenario is only **definitely infeasible from capacity alone** when:

Total available capacity < Required demand

This condition does not occur in the current dry-year toy scenario because:

760 ML > 500 ML

---

## 8. JSON Structure and Validation

The normal-year and dry-year files should use the same JSON structure.

The only intended differences are:

1. The `scenario_id`, where a different scenario identifier is permitted
2. The three documented `sources[].capacity_ML` values

No unofficial fields should be added to describe the drought assumption. The assumption and evidence belong in this Markdown document.

### Validation checklist

- [x] `scenario_normal_toy.json` opens as valid JSON
- [x] `scenario_dry_toy.json` opens as valid JSON
- [x] Both files contain the same top-level sections
- [x] Both files contain the same three source records
- [x] Only the documented `capacity_ML` values differ, apart from the scenario identifier
- [x] Demand remains 500 ML
- [x] Costs and quality values remain unchanged
- [x] Treatment and solver settings remain unchanged
- [x] All capacities use ML
- [x] No output only fields such as `volume_drawn_ML`, `percent_of_blend`, `total_cost` or `status` have been added

---

## 9. KPI Availability

| KPI | Availability | Explanation | Status |
|---|---|---|---|
| Total available capacity | Available before solving | Calculated by summing `sources[].capacity_ML` | [x] Completed |
| Capacity reduction | Available before solving | Calculated from normal and dry-year capacities | [x] Completed |
| Required demand | Available before solving | Read from `demand_zones[].required_volume_ML` | [x] Completed |
| Basic capacity margin | Available before solving | Total capacity minus required demand | [x] Completed |
| Solver feasibility status | Available after solving | Returned by the MILP solver | [ ] Pending MILP run |
| Selected source volumes | Available after solving | Decided by the MILP | [ ] Pending MILP run |
| Blend percentages | Available after solving | Calculated from selected source volumes | [ ] Pending MILP run |
| Total cost | Available after solving | Calculated from the selected blend and treatment decisions | [ ] Pending MILP run |
| Binding constraints | Available after solving | Identified from solver constraint slack | [ ] Pending MILP run |
| Water-quality safety margins | Available after solving | Calculated from the solved blend and treatment result | [ ] Pending MILP run |
| Energy use | Unavailable or provisional | Depends on whether the final model contains confirmed energy inputs and formulas | [ ] Unavailable |

---

## 10. Limitation

These scenarios use provisional toy-model values. The normal-year source capacities and other values must be updated to reflect the official reference configuration once provided. The dry-year scenario is reproducible after that update, given that the agreed and researched reduction is applied. 
