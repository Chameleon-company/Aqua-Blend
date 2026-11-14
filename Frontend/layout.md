# AquaBlend Frontend Layout Specification

## 1. Purpose

This document defines the **frontend-only UI layout and field requirements** for AquaBlend.

It is intended to guide implementation of the React / Next.js user interface and to give Claude Code a clear, structured specification of:
- which screens and sections the frontend should contain;
- which fields should be displayed;
- how MILP and AI outputs should be presented;
- which loading, success, infeasible, missing-data, and error states must exist;
- how the interface should remain consistent with the shared Results JSON contract.

This document **does not define backend implementation, database logic, Entity Framework models, or solver code**.

The frontend should treat all upstream systems as external services and depend only on stable response contracts.

## 2. Frontend Product Goal

The frontend should provide one clear operator-facing workflow:

**User Input → Optimisation Request → Solver Status → MILP Results → AI Explanation**

The interface should make the optimisation result understandable without requiring the user to know:
- PuLP;
- internal MILP variable names;
- preprocessing internals;
- database structure;
- solver implementation details.

The UI should expose the information that matters operationally:
- what scenario was evaluated;
- whether the optimisation succeeded;
- which sources were selected;
- how much water was withdrawn;
- how water flowed through the network;
- whether demand was met;
- whether water-quality limits were satisfied;
- what the solution cost;
- which important limits were binding;
- what warnings or data-quality limitations apply;
- how the result can be explained in human-readable language.

## 3. Recommended Frontend Structure

The application should be organised around the following major views:

1. **Home / Optimisation Workspace**
2. **Scenario Input Panel**
3. **Optimisation Status Panel**
4. **Results Summary**
5. **Source Selection Results**
6. **Network Flow Results**
7. **Demand Results**
8. **Water Quality Results**
9. **Cost Breakdown**
10. **Constraint / Decision Evidence**
11. **AI Explanation**
12. **Warnings and Data Quality**
13. **Result Detail / History View**
14. **System / Data Flow Information View**

The primary experience should remain focused on the optimisation workspace rather than splitting every result into a separate page.

## 4. Global Application Layout

### 4.1 Header

Recommended fields / controls:
- AquaBlend logo / project name
- Current page title
- Navigation links
- Scenario / optimisation identifier when a result is open
- User/account control if authentication is enabled upstream
- Optional theme control

Recommended navigation:
- Optimise
- Results / History
- Sources
- System Flow / About

The header should remain lightweight and should not compete with the optimisation content.

### 4.2 Main Content Container

The main content area should:
- use a readable maximum width;
- support desktop and tablet layouts;
- collapse cleanly on mobile;
- avoid dense card grids;
- prioritise result hierarchy over decorative components.

Recommended visual hierarchy:
1. solver / scenario status;
2. overall optimisation summary;
3. selected sources;
4. network and demand;
5. quality and cost;
6. AI explanation;
7. warnings / detailed evidence.

## 5. Home / Optimisation Workspace

### 5.1 Page Purpose

This is the primary working screen.

It should allow the user to:
- define or submit an optimisation request;
- see whether the request is being processed;
- view the final result directly below the input;
- view the AI explanation without navigating away.

Recommended vertical flow:

**Input**  
↓  
**Submission / loading state**  
↓  
**Solver result**  
↓  
**MILP details**  
↓  
**AI explanation**

## 6. Scenario / Natural-Language Input Panel

### 6.1 Required Fields

#### Natural-language request
Field:
- `request_text`

UI:
- large textarea or command-style input;
- placeholder with realistic AquaBlend example;
- character count optional.

Example:
> Optimise tomorrow's supply while meeting Zone 1 demand and all water-quality limits.

#### Scenario selection
Field:
- `scenario_id`

UI:
- dropdown / searchable select;
- show scenario name and status when available.

#### Optional advanced settings
Only expose if actually supported upstream.

Possible fields:
- allow estimated values
- selected source restrictions
- forced inactive sources
- demand overrides
- source availability overrides

These should be in a collapsible **Advanced** section, not shown by default.

### 6.2 Primary Actions

Required actions:
- **Run Optimisation**
- **Reset**
- optional **Load Example Scenario**

Run Optimisation should be disabled when:
- required input is empty;
- scenario selection is invalid;
- the request is already submitting.

## 7. Optimisation Status Panel

This should appear immediately after submission.

### 7.1 Status Fields

Display:
- `scenario_id`
- scenario name if available
- solver status
- objective value where available
- solve time if provided by the response used by the frontend
- timestamp if available
- warnings count

Recommended solver states:
- `Queued`
- `Running`
- `Optimal`
- `Infeasible`
- `Unbounded`
- `Not Solved`
- `Failed`

Do not show a normal result layout for an infeasible or failed solve.

## 8. Results Summary

### 8.1 Purpose

Give the user a fast understanding of the result before detailed tables.

### 8.2 Recommended Summary Fields

Where available:
- solver status
- objective / total cost
- total demand
- total delivered
- total withdrawal
- total treatment / throughput
- selected source count
- active plant count
- unmet demand
- warning count

Avoid inventing derived values if they are not present or safely calculable from the Results JSON.

## 9. Source Selection Results

### 9.1 Selected Sources

For each selected source display:

Required:
- `source_id`
- source name if available
- `is_selected`
- `withdrawal_ml_per_day`
- `blend_ratio`
- `fixed_cost_contribution`
- `withdrawal_cost_contribution`

Recommended additional fields when present in the agreed output contract:
- minimum withdrawal
- maximum withdrawal / available capacity
- utilisation percentage
- cost rank
- binding capacity indicator
- availability status
- `model_ready`
- estimated-value indicator
- provenance indicator

#### Presentation

Recommended:
- table on desktop;
- stacked detail rows on narrow screens;
- blend ratio formatted as percentage;
- cost fields currency-formatted;
- withdrawal in ML/day.

Do not expose internal solver variable names.

### 9.2 Unused Sources

For each unused source display:
- source ID / name
- selected state = false
- zero withdrawal
- reason or reason code if the final output contract provides one
- relevant availability / data-quality flag if available

Do **not** let the frontend invent a reason for non-selection.

If no deterministic reason is provided:
- display **Not selected in solved solution**
- leave explanatory reasoning to the AI section only when supported by evidence.

## 10. Network Flow Results

### 10.1 Plants

For each plant display:
- `plant_id`
- plant name if available
- `is_active`
- `throughput_ml_per_day`
- fixed cost contribution
- treatment cost contribution

Recommended when available:
- minimum throughput
- maximum throughput
- utilisation percentage

### 10.2 Source-to-Plant Flows

For each flow display:
- `source_id`
- `plant_id`
- `is_active`
- `flow_ml_per_day`

Recommended when available:
- maximum flow
- utilisation percentage
- binding capacity indicator

### 10.3 Plant-to-Zone Flows

For each flow display:
- `plant_id`
- `zone_id`
- `is_active`
- `flow_ml_per_day`

Recommended when available:
- maximum flow
- utilisation percentage

### 10.4 Visual Network Representation

Recommended visual:
- Sources → Plants → Demand Zones
- edge label = flow in ML/day
- inactive links visually subdued
- selected / active nodes emphasised
- no animation required for initial implementation

The visual should supplement, not replace, accessible tabular data.

## 11. Demand Results

For each demand zone display:
- `zone_id`
- zone name if available
- `demand_ml_per_day`
- `delivered_ml_per_day`

Recommended derived fields when contract supports them:
- unmet demand
- surplus
- demand satisfied boolean

If `demand_must_be_met` exists upstream and is surfaced to the frontend:
- clearly indicate whether the requirement was satisfied.

## 12. Water Quality Results

### 12.1 Scope

Current output is primarily concerned with:

`blend_at_plant_inflow`

Do not imply post-treatment water quality unless the output contract explicitly provides it.

### 12.2 Fields

For each plant / quality parameter:
- `plant_id`
- `parameter_id`
- `unit`
- `blended_value`
- `lower_limit`
- `upper_limit`
- `lower_margin`
- `upper_margin`
- `is_binding`

Expected parameters currently include:
- pH
- alkalinity
- turbidity

### 12.3 Display Requirements

Show:
- actual blended value;
- valid range;
- margin from each limit;
- pass / warning / binding state.

For pH:
- display the human-readable pH value returned by the solved-output contract;
- do not expose hydronium / hydrogen-ion transformation details in the standard operator view.

Those model-space transformations belong to MILP internals unless a technical diagnostics view is intentionally added later.

## 13. Cost Breakdown

Display:
- `total_source_fixed_cost`
- `total_source_withdrawal_cost`
- `total_plant_fixed_cost`
- `total_plant_treatment_cost`
- `reconstructed_total_cost`
- `solver_objective_value`
- `cost_reconciles`

### 13.1 UI Behaviour

If `cost_reconciles == true`:
- show a subtle validated state.

If `cost_reconciles == false`:
- show a visible warning;
- do not silently treat the reconstructed total as authoritative.

## 14. Constraint / Decision Evidence

This area should support transparent explanation of the solver result.

Potential fields from the agreed output contract:
- binding quality limits
- source at maximum withdrawal
- source at minimum withdrawal
- plant at maximum throughput
- link at maximum flow
- utilisation percentage
- cost rank
- feasibility state
- binding-constraint identifiers / labels

### Important Rule

The frontend must display evidence supplied by the solver/output contract.

It must **not infer causal reasoning** such as:
> Source A was selected because it was cheapest.

unless that statement is explicitly supported by the explanation / evidence data.

## 15. AI Explanation Panel

### 15.1 Purpose

Present a human-readable explanation of the solved optimisation result.

### 15.2 Display Fields

Recommended:
- explanation text
- explanation status
- confidence / evidence flag if provided
- fallback explanation indicator
- estimated-data disclosure
- supporting evidence references if available

### 15.3 Required Behaviour

The AI explanation must be visually separated from deterministic MILP values.

Recommended labels:
- **Optimisation Result**
- **AI Explanation**

Never visually imply that the AI produced the optimisation decision.

## 16. Warnings and Data-Quality Section

Display all warnings returned by the result contract.

Potential warning categories:
- estimated source data used
- missing optional data
- model result not independently verified
- cost reconciliation failure
- infeasible scenario
- quality result close to limit
- unsupported treatment feature
- incomplete downstream explanation

Warnings should be:
- concise;
- visible;
- non-blocking unless the solve/result is invalid.

## 17. State Handling

The frontend must explicitly implement these states.

### 17.1 Initial
- no result yet
- input available

### 17.2 Submitting
- disable duplicate submission
- show request being sent

### 17.3 Queued
- show optimisation queued

### 17.4 Running
- loading indicator
- solver in progress message

### 17.5 Optimal
- render full results

### 17.6 Infeasible
Render:
- clear **No feasible solution** state
- scenario identifier
- warnings / explanation if available
- no fake zero-valued result tables

### 17.7 Failed
Render:
- error state
- retry control
- user-readable error message

### 17.8 Missing / Partial Data
Render:
- available results
- explicit missing-data markers
- warnings

Never substitute `0` for unknown / missing values.

## 18. Formatting Standards

### Units
- Flow / withdrawal / throughput: `ML/day`
- Turbidity: `NTU`
- Alkalinity: `mg/L CaCO3`
- pH: `pH`
- Ratios: percentage in UI
- Monetary values: project-configured currency

### Numbers
- avoid displaying raw floating-point noise;
- use sensible rounding;
- preserve exact raw values internally if needed.

Examples:
- `0.5833333333333334` → `58.3%`
- `7.093586014879103` → `7.09`
- `47.916666666666664` → `47.92`

## 19. Component Recommendations

Suggested component structure:

```text
components/
├── layout/
│   ├── AppHeader
│   ├── Navigation
│   └── PageContainer
├── optimisation/
│   ├── OptimisationInput
│   ├── ScenarioSelector
│   ├── OptimisationStatus
│   └── OptimisationActions
├── results/
│   ├── ResultsSummary
│   ├── SourceResults
│   ├── PlantResults
│   ├── NetworkFlows
│   ├── DemandResults
│   ├── QualityResults
│   ├── CostBreakdown
│   ├── DecisionEvidence
│   └── WarningList
├── ai/
│   └── AIExplanation
└── states/
    ├── LoadingState
    ├── InfeasibleState
    ├── ErrorState
    └── EmptyState
```

This is a recommendation, not a mandatory physical folder structure.

## 20. Frontend Data Models

The frontend should define TypeScript interfaces mirroring the **agreed external Results JSON**, not the internal PuLP implementation.

Core types should include:
- `SolvedScenario`
- `SolverResult`
- `SourceResult`
- `PlantResult`
- `DemandZoneResult`
- `SourcePlantFlowResult`
- `PlantZoneFlowResult`
- `BlendedQualityResult`
- `CostBreakdown`
- `Warning`
- `AIExplanationResult`

If the output contract changes, update these types centrally rather than allowing individual components to define their own versions.

## 21. Accessibility Requirements

Minimum requirements:
- all controls keyboard accessible;
- form inputs have visible labels;
- status must not rely only on colour;
- tables have correct headings;
- loading state is announced appropriately;
- errors are associated with relevant inputs;
- network visualisation must have a text/table equivalent.

## 22. Responsive Behaviour

### Desktop
- input and status can sit side-by-side where useful;
- result tables use full-width layouts;
- network visualisation gets substantial space.

### Tablet
- stack major result sections;
- preserve readable tables or horizontal scrolling.

### Mobile
- use stacked source/plant result rows;
- avoid dense multi-column tables;
- keep primary actions easy to reach.

## 23. Frontend Boundaries

The frontend **owns**:
- presentation;
- navigation;
- input interaction;
- client-side formatting;
- user-visible state handling;
- result visualisation;
- AI explanation presentation;
- accessibility.

The frontend **does not own**:
- database queries;
- Supabase access;
- MILP preprocessing;
- solver execution;
- business-rule validation owned upstream;
- generation of deterministic reasoning;
- AI model execution;
- cost reconstruction logic.

If the UI needs a value, it should request/consume it through the agreed external contract rather than recreate upstream business logic.

## 24. Definition of Done

The frontend layout is considered complete when:

- a user can submit a valid optimisation request;
- queued/running states are visible;
- optimal results render without raw JSON inspection;
- infeasible and failed states are handled explicitly;
- selected and unused sources are understandable;
- network flows and demand delivery are visible;
- water-quality values and limits are visible;
- cost breakdown is visible;
- AI explanation is clearly separated from solver facts;
- warnings are visible;
- fields are driven by typed contracts;
- no component depends on PuLP variable names;
- the interface is responsive and accessible.
