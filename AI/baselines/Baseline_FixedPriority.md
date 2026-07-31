
Fixed-Priority Baseline Heuristic
Task: Task 3 — Create Fixed-Priority Baseline Heuristic
Member: Naga Kowshik
Project: AquaBlend — Analysis & AI Team
Version: Sprint 1 Draft (Updated)

1. Overview
This document defines a fixed-priority heuristic for allocating water sources to satisfy water demand. This baseline method is created for comparison purposes and is not intended to represent the optimal allocation strategy. The heuristic allocates water according to a predefined source priority order using the confirmed sources provided for the project.

The allocation process selects water sources sequentially until the required demand is satisfied or all available supply has been exhausted.

Units:

Volume: ML/day

Cost: AUD (where applicable)

2. Fixed Source Preference Order
The fixed-priority baseline uses the following predefined source order.

Priority	Water Source	Capacity (ML/day)	Justification
1	Silvan Reservoir	350	Primary storage reservoir with the largest available capacity.
2	Yarra Kew	300	Secondary surface water source used after Silvan Reservoir.
3	Groundwater Bore 1	60	Backup groundwater source used only when reservoir supply is insufficient.
This ordering is used only for the baseline heuristic so that future optimisation methods can be compared against a consistent allocation strategy.

3. Fixed-Priority Allocation Rule
The heuristic follows these steps:

Select the highest-priority active and connected water source.

Check the available capacity of the selected source.

Allocate water up to the remaining demand or the source capacity, whichever is smaller.

Reduce the remaining demand.

If demand still exists, continue to the next source in the priority list.

Continue until:

demand is satisfied, or

all available sources have been allocated.

If total available capacity is less than demand, return Infeasible.

4. Constraints and Assumptions
Constraint	Description
Source Activation	Only active sources can provide water.
Connectivity	Sources must be connected to the demand zone.
Capacity Limit	Allocation cannot exceed the source capacity.
Demand Satisfaction	Allocation continues until demand is met or all capacity is exhausted.
5. Numerical Example
Daily Demand
Demand = 500 ML/day
Available Water Sources
Source	Capacity (ML/day)	Activated	Connected
Silvan Reservoir	350	Yes	Yes
Yarra Kew	300	Yes	Yes
Groundwater Bore 1	60	Yes	Yes
Allocation Process
Step 1 – Silvan Reservoir
Capacity = 350 ML/day

Allocate 350 ML/day

Remaining demand:

500 − 350 = 150 ML/day
Step 2 – Yarra Kew
Capacity = 300 ML/day

Remaining demand = 150 ML/day

Allocate 150 ML/day

Remaining demand:

150 − 150 = 0 ML/day
Demand has now been fully satisfied.

Groundwater Bore 1 is not required because the demand has already been met.

Final Allocation
Source	Allocated Volume (ML/day)
Silvan Reservoir	350
Yarra Kew	150
Groundwater Bore 1	0
Total	500
Result:

Status: Feasible
The demand of 500 ML/day is completely satisfied using the first two priority sources.

6. Infeasibility Handling
If the total available capacity of all active and connected sources is less than the required demand, the heuristic returns:

Status: Infeasible

Reason:
Total available supply is insufficient to satisfy demand.
Example:

Demand = 800 ML/day

Available Supply

Silvan Reservoir = 350 ML/day
Yarra Kew = 300 ML/day
Groundwater Bore 1 = 60 ML/day

Total Available = 710 ML/day
Since:

710 < 800
the result is:

Status: Infeasible
7. Output Schema Fields
Field	Description
source_name	Name of the selected water source
priority	Priority order used for allocation
activated	Indicates whether the source is available
connected	Indicates whether the source can supply the demand zone
capacity_ML	Maximum available capacity of the source (ML/day)
allocated_volume_ML	Volume allocated from the source (ML/day)
cost_AUD	Cost associated with using the source (if applicable)
status	Final allocation result (Feasible or Infeasible)
This updated version now matches the optimisation team's confirmed data:

Demand: 500 ML/day

Silvan Reservoir: 350 ML/day

Yarra Kew: 300 ML/day

Groundwater Bore 1: 60 ML/day

Worked example outcome: Feasible (350 + 150 = 500 ML/day).


the values have been confirmed.

Since the values are now confirmed, you should remove all wording that says the sources or capacities are assumptions or illustrative. The document should present them as the official baseline data.

Specifically, make these changes:

1. Overview
Replace:

This baseline method is created for comparison purposes and is not claimed to represent current operational practice.

with:

This baseline method is used as the reference allocation strategy for evaluating optimisation approaches. It allocates water according to a predefined priority order using the confirmed project water sources.

2. Fixed Source Preference Order
Replace:

The following source preference order is an illustrative assumption used for this baseline example only.

with:

The fixed-priority baseline uses the confirmed project water sources in the following priority order.

Also remove:

This ordering is an assumed heuristic preference order and does not represent actual water management decisions unless validated by operational evidence.

Replace with:

This priority order defines the baseline allocation strategy used for comparison with optimisation methods.

3. Allocation Rule
Since there are now only confirmed capacities (no separate withdrawal limits were provided), simplify the rule to:

Select the highest-priority active and connected water source.

Allocate water up to the remaining demand or the source capacity, whichever is smaller.

Reduce the remaining demand.

Continue with the next source until demand is satisfied or all available capacity has been allocated.

If total available capacity is less than demand, return Infeasible.

4. Constraints
Replace:

Constraint	Description
Capacity and Withdrawal Limit	Allocated volume cannot exceed sources[].capacity_ML or the validated maximum daily withdrawal limit.
with:

Constraint	Description
Capacity Limit	Allocation cannot exceed the confirmed capacity of each source.
5. Numerical Example
Remove this sentence completely:

The following source names, activation status, connectivity values, capacities, and withdrawal limits are illustrative assumptions used only to demonstrate the baseline heuristic.

Replace the entire example with the confirmed values:

Source	Capacity (ML/day)	Activated	Connected
Silvan Reservoir	350	Yes	Yes
Yarra Kew	300	Yes	Yes
Groundwater Bore 1	60	Yes	Yes
Allocation:

Silvan Reservoir: Allocate 350 ML/day → Remaining demand = 150 ML/day

Yarra Kew: Allocate 150 ML/day → Remaining demand = 0 ML/day

Groundwater Bore 1: 0 ML/day (not required)

Final Allocation:

Source	Allocated (ML/day)
Silvan Reservoir	350
Yarra Kew	150
Groundwater Bore 1	0
Total	500
Status: Feasible

6. Infeasibility Example
Update it to use the confirmed capacities:

Total available capacity = 350 + 300 + 60 = 710 ML/day

Example demand = 800 ML/day

Since 710 < 800, the result is Infeasible.

7. Output Schema
Since no confirmed maximum daily withdrawal field has been provided, remove:

max_daily_withdrawal_ML

The schema should include:

source_name

priority

activated

connected

capacity_ML

allocated_volume_ML

cost_AUD (if applicable)

status

These changes ensure the document reflects the official confirmed project data rather than presenting the values as assumptions, while keeping the fixed-priority heuristic logic unchanged.


change the reqired and give me in single markdown

# Fixed-Priority Baseline Heuristic

**Task:** Task 3 — Create Fixed-Priority Baseline Heuristic  
**Member:** Naga Kowshik  
**Project:** AquaBlend — Analysis & AI Team  
**Version:** Sprint 1 Draft (Updated)

---

## 1. Overview

This document defines a **fixed-priority heuristic** for allocating water sources to satisfy water demand. This baseline method is used as the reference allocation strategy for evaluating optimisation approaches. The heuristic allocates water according to a predefined priority order using the confirmed project water sources.

The allocation process selects water sources sequentially until the required demand is satisfied or all available supply has been exhausted.

**Units:**
- Volume: ML/day
- Cost: AUD (where applicable)

---

## 2. Fixed Source Preference Order

The fixed-priority baseline uses the confirmed project water sources in the following priority order.

| Priority | Water Source | Capacity (ML/day) | Justification |
|---|---|---:|---|
| 1 | Silvan Reservoir | 350 | Primary storage reservoir with the largest available capacity. |
| 2 | Yarra Kew | 300 | Secondary surface water source used after Silvan Reservoir. |
| 3 | Groundwater Bore 1 | 60 | Backup groundwater source used only when reservoir supply is insufficient. |

This priority order defines the baseline allocation strategy used for comparison with optimisation methods.

---

## 3. Fixed-Priority Allocation Rule

The heuristic follows these steps:

1. Select the highest-priority active and connected water source.
2. Check the available capacity of the selected source.
3. Allocate water up to the remaining demand or the source capacity, whichever is smaller.
4. Reduce the remaining demand.
5. If demand remains, continue to the next source in the priority list.
6. Continue allocating until:
   - the demand is satisfied, or
   - all available source capacity has been used.
7. If the total available capacity is less than the required demand, return **Infeasible**.

---

## 4. Constraints and Assumptions

The heuristic respects the following constraints:

| Constraint | Description |
|---|---|
| Source Activation | Only active sources can provide water. |
| Connectivity | Sources must be connected to the demand zone before allocation. |
| Capacity Limit | Allocation cannot exceed the confirmed capacity of each source. |
| Demand Satisfaction | Allocation continues until the required demand is met or all available capacity has been allocated. |

---

## 5. Numerical Example

### Daily Demand

```text
Demand = 500 ML/day
```

### Available Water Sources

| Source | Capacity (ML/day) | Activated | Connected |
|---|---:|---|---|
| Silvan Reservoir | 350 | Yes | Yes |
| Yarra Kew | 300 | Yes | Yes |
| Groundwater Bore 1 | 60 | Yes | Yes |

### Allocation Process

#### Step 1 – Silvan Reservoir

- Capacity = **350 ML/day**
- Allocate **350 ML/day**

Remaining demand:

```text
500 − 350 = 150 ML/day
```

#### Step 2 – Yarra Kew

- Capacity = **300 ML/day**
- Remaining demand = **150 ML/day**
- Allocate **150 ML/day**

Remaining demand:

```text
150 − 150 = 0 ML/day
```

The demand has now been fully satisfied.

#### Step 3 – Groundwater Bore 1

No allocation is required because the demand has already been met.

### Final Allocation

| Source | Allocated Volume (ML/day) |
|---|---:|
| Silvan Reservoir | 350 |
| Yarra Kew | 150 |
| Groundwater Bore 1 | 0 |
| **Total** | **500** |

The total demand is satisfied using the first two priority sources.

```text
Status: Feasible
```

---

## 6. Infeasibility Handling

If all active and connected sources have been allocated to their maximum available capacities and the required demand has not been met, the heuristic returns:

```text
Status: Infeasible

Reason:
Total available supply is insufficient to satisfy the required demand.
```

### Example

```text
Demand = 800 ML/day
```

Available supply:

- Silvan Reservoir = 350 ML/day
- Yarra Kew = 300 ML/day
- Groundwater Bore 1 = 60 ML/day

```text
Total Available Supply = 710 ML/day
```

Since:

```text
710 < 800
```

the result is:

```text
Status: Infeasible
```

---

## 7. Output Schema Fields

The baseline heuristic uses the following schema fields:

| Field | Description |
|---|---|
| source_name | Name of the selected water source |
| priority | Priority ranking assigned to the source |
| activated | Indicates whether the source is available for allocation |
| connected | Indicates whether the source can supply the demand location |
| capacity_ML | Confirmed available capacity of the source (ML/day) |
| allocated_volume_ML | Amount of water allocated from the source (ML/day) |
| cost_AUD | Cost associated with using the source (where applicable) |
| status | Final allocation result: **Feasible** or **Infeasible** |

These fields describe the selected source, allocation amount, availability conditions, source capacities, associated costs (where applicable), and the final feasibility status of the allocation.

