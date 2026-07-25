# Demand Research: Toy-Model Demand Value

**Task:** 4. Research and select the toy-model demand value
**Owner:** Mansoor Shaik
**Sprint:** Analysis and AI, Sprint 1
**Deliverables:** `Demand_Research.md`, `toy_demand_value.json`
**Units:** Volume in ML. Time period stated for every figure.

---

## 1. Purpose

Task 4 requires a published water-demand figure to be found, recorded, converted, and then scaled into a demand value for the toy model. This document keeps the original published figure and the smaller toy-model value clearly separated, and states the final value for `demand_zones[].required_volume_ML`.

The toy model is the reservoir-only proof-of-concept described in the AquaBlend MILP Configuration (Scope 1). It uses a single demand zone sized so that no single reservoir can meet demand alone, but the connected sources together can. The demand value below is chosen to satisfy that requirement.

---

## 2. Published demand figures (original, unscaled)

### 2.1 Primary source: Melbourne Water Open Data Hub daily usage

The provided dataset `melbourne_water_5_year_complete.csv` is Melbourne Water Open Data Hub system data, the same source the configuration already uses for reservoir identity and volume. It contains a real, dated system-wide demand series in the `daily_usage_ML` column.

| Statistic | Value | Time basis |
|---|---|---|
| Coverage | 24 July 2021 to 24 July 2026 (1,826 daily values) | daily |
| 5-year mean daily usage | 1,284 ML | ML/day |
| 2025 full-year mean | 1,344 ML | ML/day |
| Minimum recorded | 775 ML | ML/day |
| Maximum recorded (peak) | 2,190 ML | ML/day |

Original published system-demand figure adopted for this document: **1,284 ML/day** (5-year mean, whole-of-Melbourne system).

Publication basis: rolling daily data, most recent value 24 July 2026.

### 2.2 Corroborating source: Melbourne's Annual Water Outlook 2026

Melbourne's Annual Water Outlook 2026 (Melbourne Water, published December 2025, quarterly update 1 March 2026) reports residential water use of about 166 litres per person per day over the most recent 12 months, and 169 litres per person per day in 2024/25.

URL: https://www.melbournewater.com.au/about/publications/water-outlook

### 2.3 Basis of the figure and cross-check between sources

The `daily_usage_ML` series is total system demand: it covers residential plus business (commercial and industrial) use plus system losses, not residential consumption alone. The two published sources reconcile on that basis:

Greater Melbourne population is approximately 5.3 million (Melbourne Water reports growth of about 140,000 in the last year).

- Residential demand implied by the published per-capita figure: 166 L/person/day x 5,300,000 people = about 880 ML/day residential.
- System mean from the dataset: 1,284 ML/day (all uses).
- Residential share implied: 880 / 1,284 = about 69 percent, leaving about 31 percent for business use and system losses.
- Total per-capita implied by the dataset: 1,284 ML/day / 5,300,000 people = about 242 L/person/day (all uses).

A residential share near two-thirds of total system demand is consistent for a large metropolitan system, so the two independent public sources agree. The dataset figure of 1,284 ML/day (total per-capita about 242 L/person/day) is the authoritative original value and the basis for the toy-model derivation in Section 4, because a demand zone must be supplied for all its uses, not residential only.

---

## 3. Unit conversions

All conversions use 1 GL = 1,000 ML and 1 ML = 1,000,000 L.

| From | Calculation | To |
|---|---|---|
| 1,284 ML/day (system mean) | 1,284 x 365 | 468,660 ML/year (about 469 GL/year) |
| 1,284 ML/day over 5.3 million people | 1,284,000,000 L / 5,300,000 | about 242 L/person/day (total, all uses) |
| 242 L/person/day x 207,000 people | see Section 4 | about 50 ML/day |
| 50 ML/day (final toy value) | 50 x 365 | 18,250 ML/year |

---

## 4. Scaling to the toy model

### 4.1 Why the toy value is far below Melbourne's real demand

The toy model is not a model of Melbourne. It is a deliberately small scale model, sized so the MILP mathematics can be checked by hand before the model is grown. Both the supply side and the demand side are shrunk together, so the absolute numbers are small but the relationship between them stays realistic.

| | Real Melbourne system | Toy model |
|---|---|---|
| People served | about 5.3 million | one demand zone (about 207,000) |
| Sources | 10 reservoirs plus desalination | 3 reservoirs (Sugarloaf, Silvan, O'Shannassy) |
| Daily supply available | the whole system | 70 ML/day (sum of the three toy caps) |
| Daily demand | about 1,284 ML/day | 50 ML/day |

The real system demand of 1,284 ML/day cannot be placed on the toy, because the three toy reservoirs supply only 70 ML/day between them. A demand of 1,284 against 70 would be trivially infeasible and would prove nothing about the model's logic. The demand is therefore scaled to the toy supply: 50 ML/day is about 3.9 percent of real demand, matched to a toy supply that is a similarly small fraction of the real system.

This matches the configuration, which calls for a single demand zone sized so no single reservoir can meet demand alone, on a toy simple enough to validate by hand. The full-scale demand near 1,300 ML/day belongs to the later fuller representative configuration (eleven reservoirs, eighteen sources), not to this toy.

### 4.2 Method: representative demand zone (per-capita x population)

The toy demand zone is defined as one representative Melbourne service area. Its demand is built from Melbourne's total per-capita use so the scaling is transparent and consistent with the total-demand basis of the source data (residential plus business plus system losses).

- Total per-capita rate: 1,284 ML/day / 5,300,000 people = about 242 L/person/day. This is the whole-of-system rate and, unlike the residential-only figure of 166 L/person/day, it already includes non-residential (business and industrial) demand and system losses, which is what a demand zone must actually be supplied.
- Assumed served population: about 207,000 residents. This is the size of one mid-sized Melbourne service zone and is recorded as an assumed toy-model input, not a measured figure.

Calculation:

```
242 L/person/day x 207,000 people
= 50,094,000 L/day
= about 50 ML/day
```

Rounded to a clean value for hand validation (Task 5 must check this by hand):

**Final toy-model demand = 50 ML/day.**

This value also falls inside the feasible window set by the toy source capacities: above the largest single source cap of 40 ML/day (so no single reservoir meets demand alone) and below the three-source total of 70 ML/day (so the blend is feasible), per Section 6. The demand-side derivation and the supply-side calibration therefore agree on 50 ML/day.

### 4.3 Cross-check: fraction of system demand

50 ML/day is 50 / 1,284 = about 3.9 percent of Melbourne's mean system demand. A single sub-zone drawing roughly one twenty-fifth of the total system demand from a three-reservoir subset is a reasonable proportion for a proof-of-concept fragment of a ten-reservoir system. The per-capita method and the fraction method agree that a value in the tens of ML/day is the correct order of magnitude.

---

## 5. Final value

| Field | Value |
|---|---|
| `demand_zones[].required_volume_ML` | **50** |
| Time basis | per day (ML/day) |
| Annual equivalent | 18,250 ML/year |
| Derivation | about 207,000 residents x 242 L/person/day (total per-capita), rounded |
| Original published system figure (kept separate) | 1,284 ML/day system mean (total, all uses); 242 L/person/day total per-capita |

---

## 6. Reasonableness against source capacities

The configuration states that source capacity is the daily extractable volume (safe yield or maximum daily withdrawal), not total storage, and that a conservative fraction of usable volume is used as a documented placeholder until real withdrawal-rate data is sourced.

### 6.1 Calibration rule the demand must satisfy

1. No single source daily-extractable capacity is greater than or equal to demand (so no single reservoir meets demand alone).
2. The sum of connected source daily-extractable capacities is greater than or equal to demand (so the blend is feasible).

### 6.2 Confirmed check using the real per-reservoir dataset

The file `melbourne_reservoir_daily_history.csv` (Melbourne Water daily reservoir history, 1 January 2000 to 24 July 2026) gives the real full-supply capacity of every Melbourne Water major reservoir. The ten reservoirs it contains are Thomson, Cardinia, Upper Yarra, Sugarloaf, Silvan, Tarago, Yan Yean, Greenvale, Maroondah, and O'Shannassy. This is the authoritative source list for the toy model.

Selected toy source set (three real reservoirs that vary in usable volume, all drawn from the proposal's case-study list):

| Toy source | Full-supply capacity (ML) | Conservative daily-extractable cap (ML/day) | Role |
|---|---|---|---|
| Sugarloaf | 96,253 | 40 | large / primary |
| Silvan | 40,445 | 25 | mid |
| O'Shannassy | 3,123 | 5 | small / backup |
| Total | | 70 | |

- Largest single daily cap = 40 ML/day, which is less than demand of 50 ML/day. Rule 1 holds (no single source meets demand alone).
- Sum of daily caps = 70 ML/day, which is greater than demand of 50 ML/day. Rule 2 holds (blend is feasible).
- Largest source is 40 of 70 = about 57 percent of the three-source total, below the 60 to 65 percent level at which one source would swamp the blend. The toy remains a genuine blending problem.
- Meeting demand requires at least two sources (40 plus 10), so the model cannot solve on a single source.
- Headroom = 70 minus 50 = 20 ML/day (about 40 percent). This is deliberately tighter than a mid-size trio so that the Task 10 dry-year capacity reduction can push the model toward infeasibility, which is what makes that scenario test meaningful.

O'Shannassy sits below demand and is not needed in a normal year, so its binary activation variable stays off in the baseline and only switches on under stress (for example the dry-year scenario). This exercises the MILP on/off activation logic, which is one of the behaviours the toy model exists to validate.

The daily-extractable caps (40, 25, 5) are conservative placeholders that vary in line with each reservoir's relative size. They represent a small operational daily withdrawal, not a fraction of total storage, and are deliberately far below real throughput to keep the toy hand-validatable. They are flagged for confirmation with Data Engineering (Section 7) and would be replaced with real safe-yield or maximum-daily-withdrawal data in Scope 2.

### 6.3 Sources considered and not used

Earlier candidate source sets were tested against the two calibration rules and set aside:

- Thomson is real (1,068,000 ML) but is by far the largest reservoir and can transfer more than 1,000 ML/day. At a 50 ML/day demand it satisfies the whole demand on its own, breaking calibration Rule 1, unless its toy cap is compressed below 50 ML/day. Using the largest reservoir in the system as a sub-50 ML/day source would read as an error, so Thomson is not used.
- Upper Yarra (200,579 ML) has the same problem at this demand scale, and in the real network Thomson feeds Upper Yarra, which feeds Silvan, so the two largest reservoirs are not independent parallel sources to blend against each other.
- A trio of Thomson, Upper Yarra, and O'Shannassy was considered but rejected: Thomson alone would be about 84 percent of the three-source total and O'Shannassy about 0.25 percent, leaving effectively nothing for the optimiser to trade off.
- The names "Barawon" and "Yashai127", raised earlier, are not real Melbourne Water reservoirs and do not appear in `melbourne_reservoir_daily_history.csv`. The closest real match to Barawon is West Barwon (about 21,500 ML), which belongs to Barwon Water in the Geelong region, not Melbourne Water.

The selected set in Section 6.2 (Sugarloaf, Silvan, O'Shannassy) keeps a real large source, a mid source, and a genuinely small source, which gives the optimiser a meaningful blend to solve while satisfying both calibration rules. The demand value of 50 ML/day is unaffected by the source-set choice, as long as the chosen three sources can together supply at least 50 ML/day.

---

## 7. Coordination with Data Engineering

Action item for the Owner: confirm with Data Engineering, in the Analysis and AI Teams chat, (a) the final three reservoirs chosen for the toy source set, and (b) the daily-extractable capacity assigned to each. Reservoir identities and full-supply capacities are now resolved by `melbourne_reservoir_daily_history.csv` (Section 6.2), so the only remaining decisions are the choice of three real reservoirs and their conservative daily caps. The proposed names Barawon and Yashai127 must be resolved first, since neither exists in the Melbourne Water data (Section 6.3). This avoids duplicated research and lets the Section 6.1 calibration be confirmed against the real toy capacities. The demand value of 50 ML/day does not change as a result of this confirmation unless the chosen sources cannot together supply 50 ML/day.

---

## 8. Limitations

1. The per-capita rate (about 242 L/person/day) is a whole-of-system total, covering residential plus business plus system losses, consistent with the total `daily_usage_ML` series. It is derived by dividing total system demand by population, so it also carries any non-revenue water and loss in that total. It is not a billed-consumption figure.
2. The served population of about 207,000 is an assumed toy-model input, not a measured demand zone. It is chosen to produce a clean, hand-validatable value of the correct order of magnitude.
3. Demand is treated as a single steady daily value. Real demand is seasonal, with the dataset showing a summer peak of 2,190 ML/day against a mean of 1,284 ML/day. Peak-demand behaviour is a scenario concern (Task 11 high-demand scenario), not part of the baseline toy value.
4. The toy source daily-extractable capacities in Section 6.2 are placeholders pending Section 7 confirmation.
5. The value applies to the Scope 1 public-data proof-of-concept only and is not an operational recommendation.

---

## 9. Task 4 checklist mapping

| Checklist item | Where addressed |
|---|---|
| At least one reliable public source is cited | Sections 2.1, 2.2, 10 |
| Publication date is recorded | Sections 2.1 (data to 24 July 2026), 2.2 (Dec 2025 / Mar 2026) |
| Original demand value is recorded | Section 2.1 (1,284 ML/day) |
| Time basis is clear (ML/day or ML/year) | Sections 2, 3, 5 (per day, with annual equivalents) |
| Unit conversions are shown | Section 3 |
| Any scaling for the toy model is explained | Section 4 |
| Final value for `demand_zones[].required_volume_ML` is stated | Section 5 (50 ML/day) |
| Final value is reasonable compared with source capacities | Section 6 |
| Data Engineering is contacted to avoid duplicated research | Section 7 (action item) |
| Limitations are stated | Section 8 |

---

## 10. Sources

1. Melbourne Water Open Data Hub system data, provided as `melbourne_water_5_year_complete.csv`, coverage 24 July 2021 to 24 July 2026. Column `daily_usage_ML`.
2. Melbourne's Annual Water Outlook 2026, Melbourne Water, published December 2025 with quarterly update 1 March 2026. https://www.melbournewater.com.au/about/publications/water-outlook
3. 2023/24 Desalinated Water Order Advice (Technical Analysis), Melbourne Water. Per-reservoir capacity table. https://www.melbournewater.com.au/water-and-environment/water-management/water-storage-reservoirs
4. Thomson Reservoir facts (transfer capacity over 1,000 ML/day, usable volume 1,068,000 ML), Melbourne Water. https://www.melbournewater.com.au/water-and-environment/water-management/water-storage-reservoirs/thomson-reservoir
5. Melbourne Water daily reservoir history, provided as `melbourne_reservoir_daily_history.csv`, coverage 1 January 2000 to 24 July 2026. Per-reservoir full-supply capacity and daily volume for the ten major Melbourne Water reservoirs (Thomson, Cardinia, Upper Yarra, Sugarloaf, Silvan, Tarago, Yan Yean, Greenvale, Maroondah, O'Shannassy).
