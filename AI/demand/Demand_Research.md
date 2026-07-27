# Demand Research: Toy-Model Demand Value

- **Task:** 4. Research and select the toy-model demand value

- **Owner:** Mansoor Shaik

- **Sprint:** Analysis and AI, Sprint 1

- **Deliverables:** `Demand_Research.md`, `toy_demand_value.json`

- **Units:** Volume in ML. Time period stated for every figure.


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

- Assumed served population: about 207,000 residents. This is an assumed toy-model input, not a measured figure. Section 4.3 sets out why this size was chosen.


Calculation:

```
242 L/person/day x 207,000 people
= 50,094,000 L/day
= about 50 ML/day
```

Rounded to a clean value for hand validation (Task 5 must check this by hand):

**Final toy-model demand = 50 ML/day.**

### 4.3 Justification for the assumed population of 207,000

Because the assumed population directly produces the final 50 ML/day value, the choice is justified on two independent grounds: it must correspond to a real, recognisable unit of Melbourne's water system, and it must produce a demand that makes the toy a genuine blending problem.

**Ground 1: it matches the size of a real mid-sized Melbourne service area.**

Melbourne's metropolitan area is made up of 31 local government areas serving a total population of about 5.3 million, giving an average of roughly 171,000 residents per LGA. A demand zone of about 207,000 is therefore the size of one real mid-sized metropolitan council area, which is the natural smallest unit at which bulk water demand is meaningfully aggregated. Real comparators at 30 June 2024:

| Comparator LGA | Estimated resident population (2024) |
|---|---|
| City of Monash | 209,268 |
| City of Whitehorse | 183,462 |
| Metropolitan average (5.3 million / 31 LGAs) | about 171,000 |

The assumed 207,000 sits within about 1 percent of the City of Monash, an established mid-sized eastern-suburbs council area supplied from the same Yarra and Silvan system that the toy's sources sit on. The toy zone is therefore not an arbitrary number: it is the population of one plausible real service area, and no claim is made that it is the measured population of any specific zone.

**Ground 2: it lands the demand inside the window that makes the toy non-trivial.**

The toy is only useful if demand is above the largest single source cap (so no reservoir can meet it alone) and below the sum of the caps (so a blend is feasible). Against the provisional caps in Section 6, that window is 40 to 70 ML/day, which at 242 L/person/day corresponds to a population between about 165,000 and about 289,000. A value of 207,000 sits close to the middle of that band rather than at either edge, so the toy keeps headroom on both sides and does not become infeasible or trivially solvable if the caps are revised slightly.

Sensitivity of the final value to this assumption:

| Assumed population | Resulting demand (ML/day) | Toy still valid? |
|---|---|---|
| 165,000 | 40 | No, equals the largest single cap |
| 207,000 (adopted) | 50 | Yes, mid-window |
| 289,000 | 70 | No, exhausts total supply |

The two grounds agree. A real mid-sized Melbourne council area of roughly 200,000 people is also, at Melbourne's total per-capita rate, exactly the population that produces a mid-window toy demand. The value is then rounded from 50.1 to 50 ML/day for hand validation.

### 4.4 Cross-check: fraction of system demand

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

## 6. Reasonableness against provisional source capacities

**Status of this section: provisional.** The per-source daily-extractable capacities used below are assumed model inputs created for this task. They have not been confirmed by Data Engineering or by the Optimisation lead, and they are not published Melbourne Water figures. The full-supply capacities are real and sourced; only the daily-extractable caps are assumed. The calibration result in Section 6.2 therefore holds against these provisional inputs only, and must be re-run once real safe-yield or maximum-daily-withdrawal values are supplied (Section 7).

### 6.1 Calibration rule the demand must satisfy

1. No single source daily-extractable capacity is greater than or equal to demand (so no single reservoir meets demand alone).
2. The sum of connected source daily-extractable capacities is greater than or equal to demand (so the blend is feasible).

### 6.2 Provisional check using the real per-reservoir dataset

The file `melbourne_reservoir_daily_history.csv` (Melbourne Water daily reservoir history, 1 January 2000 to 24 July 2026) gives the real full-supply capacity of every Melbourne Water major reservoir. The ten reservoirs it contains are Thomson, Cardinia, Upper Yarra, Sugarloaf, Silvan, Tarago, Yan Yean, Greenvale, Maroondah, and O'Shannassy. This is the authoritative source list for the toy model.

Selected toy source set (three real reservoirs that vary in usable volume, all drawn from the proposal's case-study list):

| Toy source | Full-supply capacity (ML) | Provisional daily-extractable cap (ML/day), assumed | Role |
|---|---|---|---|
| Sugarloaf | 96,253 | 40 (provisional) | large / primary |
| Silvan | 40,445 | 25 (provisional) | mid |
| O'Shannassy | 3,123 | 5 (provisional) | small / backup |
| Total | | 70 (provisional) | |

Against those provisional caps:

- Largest single provisional daily cap = 40 ML/day, which is less than demand of 50 ML/day. Rule 1 holds provisionally (no single source meets demand alone).

- Sum of provisional daily caps = 70 ML/day, which is greater than demand of 50 ML/day. Rule 2 holds provisionally (blend is feasible).

- Largest source is 40 of 70 = about 57 percent of the three-source total, below the 60 to 65 percent level at which one source would swamp the blend. On these inputs the toy remains a genuine blending problem.

- Meeting demand requires at least two sources (40 plus 10), so on these inputs the model cannot solve on a single source.

- Headroom = 70 minus 50 = 20 ML/day (about 40 percent). This is deliberately tighter than a mid-size trio so that a later capacity-reduction scenario can push the model toward infeasibility, which is what makes that scenario test meaningful.

None of the five results above should be read as confirmed. They are the expected behaviour of the toy if the assumed caps are adopted; each is contingent on Data Engineering confirming the 40, 25 and 5 ML/day values or supplying replacements.

O'Shannassy sits below demand and is not needed in a normal year, so its binary activation variable stays off in the baseline and only switches on under stress (for example the dry-year scenario). This exercises the MILP on/off activation logic, which is one of the behaviours the toy model exists to validate.

The provisional caps (40, 25, 5) are conservative placeholders that vary in line with each reservoir's relative size. They represent a small operational daily withdrawal, not a fraction of total storage, and are deliberately far below real throughput to keep the toy hand-validatable. They are flagged for confirmation with Data Engineering (Section 7) and would be replaced with real safe-yield or maximum-daily-withdrawal data in Scope 2.

### 6.3 Sources considered and not used

Earlier candidate source sets were tested against the two calibration rules and set aside:

- Thomson is real (1,068,000 ML) but is by far the largest reservoir and can transfer more than 1,000 ML/day. At a 50 ML/day demand it satisfies the whole demand on its own, breaking calibration Rule 1, unless its toy cap is compressed below 50 ML/day. Using the largest reservoir in the system as a sub-50 ML/day source would read as an error, so Thomson is not used.

- Upper Yarra (200,579 ML) has the same problem at this demand scale, and in the real network Thomson feeds Upper Yarra, which feeds Silvan, so the two largest reservoirs are not independent parallel sources to blend against each other.

- A trio of Thomson, Upper Yarra, and O'Shannassy was considered but rejected: Thomson alone would be about 84 percent of the three-source total and O'Shannassy about 0.25 percent, leaving effectively nothing for the optimiser to trade off.

- The names "Barawon" and "Yashai127", raised earlier, have since been resolved by files supplied by Data Engineering. They are water quality monitoring station identifiers, not reservoirs: `BARWON @ GEELONG` (Victorian station 233217) and `YAOSH0127` (station 229421). Neither appears in `melbourne_reservoir_daily_history.csv` because neither is a storage. BARWON @ GEELONG is a Barwon River site in the Geelong region, operated outside the Melbourne Water supply system, so it is not a candidate source for this toy regardless.

The selected set in Section 6.2 (Sugarloaf, Silvan, O'Shannassy) keeps a real large source, a mid source, and a genuinely small source, which gives the optimiser a meaningful blend to solve while satisfying both calibration rules. The demand value of 50 ML/day is unaffected by the source-set choice, as long as the chosen three sources can together supply at least 50 ML/day.

---

## 7. Coordination with Data Engineering

Action item for the Owner: confirm with Data Engineering, in the Analysis and AI Teams chat, (a) the final three reservoirs chosen for the toy source set, and (b) the daily-extractable capacity assigned to each. Reservoir identities and full-supply capacities are now resolved by `melbourne_reservoir_daily_history.csv` (Section 6.2), so the only remaining decisions are the choice of three real reservoirs and their conservative daily caps. The proposed names Barawon and Yashai127 have now been resolved as monitoring station identifiers rather than reservoirs (Section 6.3), so they do not add candidate sources. The daily-extractable capacities remain outstanding: the files supplied to date contain water quality parameters only, with no volume, flow or extraction data. This avoids duplicated research and lets the Section 6.1 calibration be confirmed against the real toy capacities. The demand value of 50 ML/day does not change as a result of this confirmation unless the chosen sources cannot together supply 50 ML/day.

---

## 8. Limitations

1. The per-capita rate (about 242 L/person/day) is a whole-of-system total, covering residential plus business plus system losses, consistent with the total `daily_usage_ML` series. It is derived by dividing total system demand by population, so it also carries any non-revenue water and loss in that total. It is not a billed-consumption figure.
2. The served population of about 207,000 is an assumed toy-model input, not a measured demand zone. Section 4.3 justifies the size against real Melbourne LGA populations and against the calibration window, but the zone itself is representative rather than an actual Melbourne Water service area boundary.
3. Demand is treated as a single steady daily value. Real demand is seasonal, with the dataset showing a summer peak of 2,190 ML/day against a mean of 1,284 ML/day. Peak-demand behaviour is a scenario concern (Task 11 high-demand scenario), not part of the baseline toy value.
4. The toy source daily-extractable capacities in Section 6.2 (40, 25 and 5 ML/day) are provisional assumed inputs, not confirmed values. The Section 6.2 calibration result is provisional for the same reason and must be re-run after Section 7 confirmation.
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
6. Australian Bureau of Statistics, Regional Population, estimated resident population by local government area at 30 June 2024. City of Monash 209,268; City of Whitehorse 183,462. https://profile.id.com.au/monash/about

7. Local government areas of metropolitan Melbourne (31 LGAs across Greater Melbourne). https://en.wikipedia.org/wiki/Category:Local_government_areas_in_Melbourne
