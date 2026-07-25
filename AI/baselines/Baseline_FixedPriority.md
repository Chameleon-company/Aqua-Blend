# Fixed-Priority Baseline Heuristic

**Task:** Task 3 — Create Fixed-Priority Baseline Heuristic  
**Member:** Naga Kowshik  
**Project:** AquaBlend — Analysis & AI Team  
**Version:** Sprint 1 Draft  

## 1. Overview

This document defines an **assumed fixed-priority heuristic** for allocating water sources to satisfy water demand. This baseline method is created for comparison purposes and is **not claimed to represent current operational practice**. The source preference order used in this document is an illustrative assumption and may change when the official toy-model is confirmed.

The heuristic uses a predefined preference order for selecting water sources and allocates supply sequentially until demand is met or available supply is exhausted.

**Units:**
- Volume: ML
- Cost: AUD (where applicable)

---

## 2. Fixed Source Preference Order

The following source preference order is an **illustrative assumption used for this baseline example only**. It is intended for comparison purposes and may be updated once the official toy-model water source definitions are confirmed.

| Priority | Source Type | Justification |
|---|---|---|
| 1 | Surface Water Reservoirs | Used as the first preference due to high storage capacity and suitability as a primary supply source. |
| 2 | Recycled Water Sources | Used after surface water to utilise alternative supply and reduce dependence on limited sources. |
| 3 | Groundwater Sources | Used as a secondary backup source when higher-priority sources cannot satisfy demand. |
| 4 | Emergency Supply Sources | Used only when other available sources are insufficient. |

This ordering is an **assumed heuristic preference order** and does not represent actual water management decisions unless validated by operational evidence.

---

## 3. Fixed-Priority Allocation Rule

The heuristic follows these steps:

1. Select the highest-priority active and connected water source.

2. Validate the maximum daily withdrawal limit of the selected source before allocation.

3. Allocate water from the selected source up to the lower value between:
   - available source capacity (`sources[].capacity_ML`), and
   - maximum daily withdrawal limit (`sources[].max_daily_withdrawal_ML`).

4. Allocation continues until:
   - `demand_zones[].required_volume_ML` is satisfied, or
   - the validated daily withdrawal limit is reached.

5. If demand remains, move to the next available source in the preference order.

6. Continue allocating from available sources until:
   - `demand_zones[].required_volume_ML` is satisfied, or
   - no additional supply remains.

7. If the total available supply cannot satisfy `demand_zones[].required_volume_ML`, mark the result as **Infeasible**.

---

## 4. Constraints and Assumptions

The heuristic respects the following constraints:

| Constraint | Description |
|---|---|
| Source Activation | Only sources marked as active can provide water. |
| Connectivity | A source must have a valid connection to the demand location before allocation. |
| Capacity and Withdrawal Limit | Allocated volume cannot exceed `sources[].capacity_ML` or the validated maximum daily withdrawal limit `sources[].max_daily_withdrawal_ML`. |
| Demand Satisfaction | Allocation continues until `demand_zones[].required_volume_ML` is met or supply is exhausted. |

---

## 5. Numerical Example

### Demand Requirement

```
Demand = 100 ML
```

The following source names, activation status, connectivity values, capacities, and withdrawal limits are **illustrative assumptions** used only to demonstrate the baseline heuristic. They do not represent the confirmed toy-model dataset.

### Available Water Sources

| Source | Source Type | Capacity (ML) | Max Daily Withdrawal (ML) | Activated | Connected |
|---|---|---:|---:|---|---|
| Lake Reservoir | Surface Water Reservoir | 60 | 40 | Yes | Yes |
| Recycled Water Plant | Recycled Water Source | 30 | 30 | Yes | Yes |
| Bore Water Supply | Groundwater Source | 40 | 20 | Yes | Yes |

### Allocation Process

**Step 1: Surface Water Reservoir**

- Available capacity = 60 ML
- Maximum daily withdrawal = 40 ML
- Allocate 40 ML

Remaining demand:

```
100 - 40 = 60 ML
```

**Step 2: Recycled Water Source**

- Available capacity = 30 ML
- Maximum daily withdrawal = 30 ML
- Allocate 30 ML

Remaining demand:

```
60 - 30 = 30 ML
```

**Step 3: Groundwater Source**

- Available capacity = 40 ML
- Maximum daily withdrawal = 20 ML
- Allocate 20 ML

Remaining demand:

```
30 - 20 = 10 ML
```

No additional validated daily withdrawal capacity is available.

### Final Allocation

| Source | Allocated Volume (ML) |
|---|---:|
| Lake Reservoir | 40 |
| Recycled Water Plant | 30 |
| Bore Water Supply | 20 |
| Total | 90 |

The total demand cannot be satisfied due to daily withdrawal limits; therefore, the heuristic result is:

```
Status: Infeasible
```

---

## 6. Infeasibility Handling

If all active and connected water sources reach their validated maximum daily withdrawal limits before meeting demand, the heuristic returns:

```
Status: Infeasible

Reason: Available daily withdrawal capacity is insufficient to satisfy total demand.
```

Example:

```
Demand = 200 ML
Available Daily Withdrawal = 150 ML

Result:
Infeasible
```

---

## 7. Output Schema Fields

The baseline heuristic uses the following schema fields:

| Field | Description |
|---|---|
| source_name | Name of the selected water source |
| source_type | Category/type of water source |
| priority | Priority ranking assigned to the source |
| activated | Indicates whether the source is available for allocation |
| connected | Indicates whether the source can supply the demand location |
| capacity_ML | Maximum available capacity of the source in ML |
| max_daily_withdrawal_ML | Maximum volume that can be withdrawn from the source per day in ML |
| allocated_volume_ML | Amount of water allocated from the source in ML |
| cost_AUD | Cost associated with using the source in AUD (where applicable) |
| status | Final allocation result: Feasible or Infeasible |

These fields describe the selected source, allocation amount, availability conditions, withdrawal limits, cost information, and final feasibility status.