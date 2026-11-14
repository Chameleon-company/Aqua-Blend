# Aqua Blend Frontend Refactor — Claude Implementation Specification

## Purpose

This document is the implementation specification for updating the existing Aqua Blend frontend to match the newly agreed integration and orchestration architecture.

It is intended to be provided directly to Claude or another coding agent working on the existing frontend repository.

The goal is **not** to rebuild the frontend blindly from scratch.

The goal is to:

- inspect the existing frontend;
- preserve reusable pages, components, styling and visualisations;
- remove assumptions that no longer match the integration architecture;
- add the missing scenario-creation workflow;
- separate scenario creation from optimisation execution;
- connect the frontend to a stable backend API contract;
- support MILP run states;
- display MILP results;
- display AI summaries and anomalies;
- support infeasibility diagnostics;
- prepare the frontend for stress testing;
- keep the frontend independent of MILP implementation details.

---

# 1. Core Architectural Change

The frontend must now be built around the following application workflow:

```text
User
  ↓
Create / Configure Scenario
  ↓
Frontend Validation
  ↓
Save Scenario through Backend
  ↓
Backend enriches data from Supabase
  ↓
Canonical ScenarioData created and validated
  ↓
Scenario becomes Ready
  ↓
User presses Run Optimisation
  ↓
Backend creates run_id
  ↓
MILP runs
  ↓
MILP result stored
  ↓
Feasible / Optimal
  └──→ AI analysis
  ↓
Infeasible
  └──→ Diagnostics → AI explanation
  ↓
Failed
  └──→ Technical error state
  ↓
Frontend Results
```

The frontend must **not** directly orchestrate MILP, AI, Supabase, or diagnostics.

The frontend communicates with the backend only.

---

# 2. Important Product-Level Separation

The application must expose two clearly separate user actions.

## Action 1 — Create / Configure Scenario

The user defines the scenario conditions.

The frontend collects only scenario-specific inputs and identifiers.

The backend then combines those inputs with canonical Supabase data to construct the final `ScenarioData`.

## Action 2 — Run Optimisation

The user runs a saved, validated scenario.

This must be a separate action.

The user should not need to recreate the scenario every time an optimisation is run.

One scenario may eventually have multiple runs.

Conceptually:

```text
Scenario
  ├── Run 001
  ├── Run 002
  └── Run 003
```

Therefore the frontend must distinguish between:

```text
scenario_id
```

and:

```text
run_id
```

---

# 3. Do Not Treat Every ScenarioData Field as a User Input

The backend must ultimately construct the complete canonical `ScenarioData`.

However, the frontend should **not** show a form input for every dataclass field.

The final scenario is created using:

```text
User Inputs
+
Supabase Reference Data
+
Backend/System Generated Fields
=
Canonical ScenarioData
```

The frontend's job is to collect the parts the user actually controls.

---

# 4. Canonical ScenarioData Being Supported

The frontend changes must support a backend that ultimately constructs these structures:

```python
SourceInput
PlantInput
DemandZoneInput
SourcePlantLinkInput
PlantZoneLinkInput
ScenarioData
```

The canonical scenario contains:

```text
scenario_id
scenario_name
status
description

sources
plants
demand_zones

source_to_plant_links
plant_to_zone_links

quality_limits
validation_issues
```

Claude must not create frontend assumptions that conflict with this structure.

---

# 5. Frontend Data Ownership Rules

Use the following ownership model.

## User-controlled

The frontend may collect:

```text
scenario_name
description

which sources are included / available for the scenario
optional forced source inactivity
optional source withdrawal overrides

which plants are available / active for the scenario
optional plant capacity overrides

demand values for selected demand zones

quality profile
optional advanced quality overrides

optional network outage / capacity override assumptions
```

## Supabase-backed / reference data

The frontend displays these values but does not ask the user to re-enter them:

```text
source_id
source name
source type
source quality values
source default capacities
source default costs
source availability
source model-readiness

plant_id
plant name
plant capacities
plant fixed activation cost
plant treatment cost

demand-zone IDs
demand-zone names

physical source → plant links
physical plant → zone links
default link capacities

quality parameter definitions
quality units
quality profiles
```

## Backend/system generated

The frontend must not ask the user for:

```text
scenario_id
run_id
status
validation_issues
withdrawal_bounds_origin
provenance
database_model_ready
has_estimated_values
```

These values may be displayed where useful, but are not manual inputs.

---

# 6. Critical Rule About Network Links

The existing or future frontend must **not** treat physical network links as normal user-created relationships.

The physical topology should come from the backend / Supabase.

For example:

```text
Source A → Plant 1
Plant 1 → Zone North
```

should already exist as network data.

The user does not choose the actual water flow.

The MILP decides the actual solved flow.

The user may optionally change a link only as an advanced scenario condition, such as:

```text
Simulate this link as unavailable
```

or:

```text
Reduce capacity to 40 ML/day
```

Therefore:

- do not build a generic free-form "create network link" UI;
- do not let the user type source and plant IDs;
- do not make link selection mandatory in the normal scenario workflow;
- show network configuration as read-only/default unless an advanced override is enabled.

---

# 7. Existing Frontend — Preserve Useful Work

The current frontend already contains useful concepts around:

- optimisation results;
- AI explanations;
- source information;
- costs;
- blend percentages;
- constraints;
- warnings;
- solver status;
- loading states;
- infeasible states;
- missing-data states;
- backend-error states.

Claude should inspect the repository before modifying anything.

Do not delete working components simply because this document proposes a new page structure.

Instead:

1. identify reusable existing components;
2. map them into the new route structure;
3. preserve styling and visual consistency where possible;
4. refactor data dependencies rather than rebuilding visual components unnecessarily.

---

# 8. Recommended New Application Information Architecture

The frontend should be organised around the following primary areas:

```text
Dashboard
Scenarios
Optimisation Runs
Results
Stress Testing
```

A simple main navigation could be:

```text
Dashboard
Scenarios
Runs
```

Stress testing can live inside a run rather than needing a top-level navbar item.

Do not overpopulate the navbar.

---

# 9. Recommended Frontend Routes

Use the following route architecture unless the existing codebase has a strong reason to use equivalent route names.

```text
/dashboard

/scenarios
/scenarios/new
/scenarios/:scenarioId
/scenarios/:scenarioId/edit

/runs/:runId
/runs/:runId/results
/runs/:runId/stress-testing
```

If using the Next.js App Router, these could map approximately to:

```text
app/
  dashboard/
    page.tsx

  scenarios/
    page.tsx

    new/
      page.tsx

    [scenarioId]/
      page.tsx

      edit/
        page.tsx

  runs/
    [runId]/
      page.tsx

      results/
        page.tsx

      stress-testing/
        page.tsx
```

Adapt to the actual repository structure rather than forcing this exact folder structure if Pages Router or another organisation is already used.

---

# 10. Dashboard Page

Route:

```text
/dashboard
```

Purpose:

Provide the user with a high-level entry point into Aqua Blend.

Recommended content:

```text
Create New Scenario
Recent Scenarios
Recent Optimisation Runs
Recent Infeasible Runs
Recent Failed Runs
```

Possible dashboard cards:

```text
Total Scenarios
Ready Scenarios
Recent Runs
Infeasible Runs
```

Do not make these counts mandatory if the backend does not yet expose them.

The most important CTA is:

```text
Create Scenario
```

---

# 11. Scenario List Page

Route:

```text
/scenarios
```

Purpose:

Display saved scenarios.

Each scenario item should preferably show:

```text
Scenario Name
Status
Description preview
Last Modified
Most Recent Run
```

Useful actions:

```text
View
Edit
Run Optimisation
```

Only show **Run Optimisation** as enabled when the scenario is ready.

Potential scenario statuses:

```text
draft
validating
ready
validation_failed
```

Use the exact backend enum once finalised.

---

# 12. Create Scenario Page

Route:

```text
/scenarios/new
```

This is one of the biggest changes required in the frontend.

The page should act as a structured scenario builder.

Recommended sections:

```text
1. Scenario Details
2. Sources
3. Treatment Plants
4. Demand Zones
5. Water Quality
6. Advanced Network Overrides
7. Validation Summary
```

Do not expose internal MILP parameters directly unless explicitly required.

---

# 13. Scenario Details Section

User-entered:

```text
Scenario Name *
Description
```

Scenario Name is mandatory.

Description is optional.

Example UI:

```text
Scenario Name
[ High Demand Summer Case ]

Description
[ Test the network under increased summer demand ]
```

Do not show editable fields for:

```text
scenario_id
status
validation_issues
```

These are backend/system values.

---

# 14. Sources Section

Reference data should be loaded from:

```http
GET /api/sources
```

The user should see a clear list or table.

Recommended columns:

```text
Use
Source
Type
Availability
Default Maximum Withdrawal
Scenario Override
```

Example concept:

```text
✓ Source A | Groundwater | Available | 70 ML/day | Default
✓ Source B | Surface     | Available | 50 ML/day | Override: 40
  Source C | Recycled    | Offline   | —         | —
```

User-controlled:

```text
enabled
forced_inactive
optional minimum withdrawal override
optional maximum withdrawal override
```

Read-only/reference values:

```text
source name
source type
availability
default capacity
model readiness
```

Do not require users to manually type:

```text
fixed_activation_cost
cost_per_ml
quality
provenance
database_model_ready
has_estimated_values
```

These belong to Supabase/backend.

---

# 15. Source Advanced Override Behaviour

Overrides should be optional.

Default behaviour:

```text
Use Database Values
```

Advanced behaviour:

```text
Override Minimum Withdrawal
Override Maximum Withdrawal
Force Source Inactive
```

If the user provides an override, the request payload may include the overridden value.

The backend is responsible for determining:

```text
withdrawal_bounds_origin
```

The frontend should not calculate that field itself.

---

# 16. Treatment Plants Section

Reference data:

```http
GET /api/plants
```

Recommended UI:

```text
Use
Plant Name
Default Minimum Capacity
Default Maximum Capacity
Scenario Override
```

User-controlled:

```text
enabled
optional capacity overrides
```

Reference/database values:

```text
plant_id
name
minimum capacity
maximum capacity
fixed activation cost
treatment cost per ML
```

The user does not choose actual plant throughput.

The MILP determines actual throughput.

---

# 17. Demand Zones Section

Reference data:

```http
GET /api/demand-zones
```

This is one of the most important direct user-input areas.

Recommended UI:

```text
Demand Zone
Required Demand (ML/day)
```

User provides:

```text
demand_ml_per_day
```

Example:

```text
North Zone
[ 120 ] ML/day
```

Validation:

```text
demand > 0
```

Do not ask the user to type `zone_id`.

The selected zone should already provide the ID.

---

# 18. Water Quality Section

Reference data:

```http
GET /api/quality-profiles
```

Preferred normal UX:

```text
Water Quality Profile
[ Standard Profile ▼ ]
```

Optional advanced section:

```text
Customise Quality Limits
```

If expanded, show parameter-specific limits.

Possible structure:

```text
Parameter
Minimum
Maximum
Unit
```

Example:

```text
TDS
Maximum: 500 mg/L
```

Units and parameter definitions are backend/reference values.

Avoid free-text quality parameter names.

---

# 19. Advanced Network Overrides Section

This should be collapsed or labelled as advanced.

Reference data:

```http
GET /api/network-links
```

Default behaviour:

```text
Use Current Network Configuration
```

Only expose modifications when the user intentionally wants to simulate a network condition.

Possible controls:

```text
Simulate Source → Plant Link Outage
Simulate Plant → Zone Link Outage
Override Link Capacity
```

Do not let the user decide actual water flows.

The MILP decides flows.

---

# 20. Validation Summary Section

Before a scenario can be run, the frontend should clearly show whether it is ready.

Suggested UI:

```text
Scenario Validation

✓ Scenario name provided
✓ At least one source selected
✓ At least one plant selected
✓ Demand values valid
✓ Quality profile selected
✓ Valid network path exists

Scenario Ready
```

Backend validation issues should be displayed directly.

Example:

```text
Scenario Not Ready

• North Zone has no valid enabled route.
• Source B is missing required model data.
```

Do not fabricate validation messages client-side for backend-only checks.

---

# 21. Frontend Validation

Frontend validation is for immediate user experience.

Perform basic checks such as:

```text
scenario name is not empty
at least one source is selected
at least one plant is selected
at least one demand zone exists
demand is greater than zero
numeric overrides are valid
quality selection exists
```

Do not rely on frontend validation as authoritative.

---

# 22. Backend Validation

The frontend must assume the backend performs authoritative validation.

The backend verifies:

```text
IDs exist
assets are valid
links exist
model-ready data exists
required costs exist
required capacities exist
quality identifiers are supported
overrides are valid
network path exists
ScenarioData can be fully populated
```

Frontend behaviour:

```text
submit scenario
↓
receive validation result
↓
display validation issues
↓
only enable Run Optimisation when ready
```

---

# 23. Mandatory ScenarioData Completion Rule

The frontend must be designed around this rule:

> Every required field in the canonical `ScenarioData` and nested input dataclasses must have a valid value before optimisation begins.

However, the frontend is **not** responsible for manually collecting all those values.

The complete object is assembled from:

```text
frontend user choices
+
Supabase values
+
backend-generated values
```

If required data is missing:

```text
validation_issues
↓
ScenarioData.is_ready == False
↓
Run Optimisation disabled / blocked
```

---

# 24. Create Scenario Request

Use:

```http
POST /api/scenarios
```

The frontend should send the user's selections and overrides.

It should not send a duplicated copy of every canonical database record.

Example conceptual request:

```json
{
  "scenario_name": "High Demand Summer Case",
  "description": "Test increased demand.",
  "sources": [
    {
      "source_id": "SRC_001",
      "enabled": true,
      "forced_inactive": false
    }
  ],
  "plants": [
    {
      "plant_id": "PLANT_001",
      "enabled": true
    }
  ],
  "demand_zones": [
    {
      "zone_id": "ZONE_001",
      "demand_ml_per_day": 120
    }
  ],
  "quality_profile_id": "STANDARD_001"
}
```

Do not treat this example as the immutable final DTO.

Use the backend's actual contract when available.

---

# 25. Saving a Scenario

Provide clear actions such as:

```text
Save Draft
Validate Scenario
```

A possible behaviour:

```text
Save Draft
↓
POST /api/scenarios
↓
Backend creates scenario_id
↓
Redirect to /scenarios/:scenarioId
```

For existing scenarios:

```text
PUT /api/scenarios/:scenarioId
```

---

# 26. Scenario Overview Page

Route:

```text
/scenarios/:scenarioId
```

Purpose:

Display the saved scenario and its readiness.

Recommended sections:

```text
Scenario Details
Selected Sources
Selected Plants
Demand Zones
Quality Profile
Advanced Overrides
Validation Status
Run History
```

Primary actions:

```text
Edit Scenario
Validate
Run Optimisation
```

---

# 27. Scenario Edit Page

Route:

```text
/scenarios/:scenarioId/edit
```

Reuse the same form components from `/scenarios/new`.

Do not create two separate implementations of the scenario form.

Preferred:

```text
ScenarioForm
```

used for both create and edit modes.

---

# 28. Run Optimisation Action

The frontend must call:

```http
POST /api/scenarios/:scenarioId/runs
```

Do not call:

```http
POST /api/run-milp
```

from the frontend.

The frontend only requests:

```text
Run this scenario
```

The backend handles orchestration.

---

# 29. Run Creation UX

When the user presses **Run Optimisation**:

1. disable duplicate submission;
2. show immediate run-creation feedback;
3. receive or resolve the `run_id`;
4. navigate to:

```text
/runs/:runId
```

The run page then represents processing state.

---

# 30. Run Status Page

Route:

```text
/runs/:runId
```

Use:

```http
GET /api/runs/:runId
```

Possible states:

```text
queued
solving
solved
diagnosing
analysing
completed
infeasible
failed
```

Use the actual backend enum once finalised.

Recommended visual progression:

```text
Scenario Ready
↓
Optimisation Running
↓
MILP Completed
↓
AI Analysis
↓
Results Ready
```

For infeasible cases:

```text
Optimisation Running
↓
Scenario Infeasible
↓
Diagnostics Running
↓
AI Explanation
↓
Results Ready
```

---

# 31. Status Component

Build a reusable component such as:

```text
RunStatus
```

It should accept a run state rather than hard-coding workflow logic into pages.

Potential rendering:

```text
queued       → Waiting to start
solving      → Running optimisation
diagnosing   → Analysing infeasibility
analysing    → Generating AI insights
completed    → Completed
failed       → Failed
```

Avoid displaying raw enum values directly if a friendly label is better.

---

# 32. Run Data Refresh

The frontend needs a way to update run state while processing.

Possible initial implementation:

```text
poll GET /api/runs/:runId
```

Use a reasonable interval.

Do not poll every few hundred milliseconds.

Stop polling when the run reaches a terminal state such as:

```text
completed
failed
```

If the backend later provides WebSocket or Server-Sent Events support, this can be upgraded without changing the page structure.

---

# 33. Results Page

Route:

```text
/runs/:runId/results
```

This should become the central post-optimisation view.

Recommended sections:

```text
Run Summary
Solver Status
Objective / Cost Summary
Source Allocations
Plant Utilisation
Demand Fulfilment
Network Flows
Quality Results
AI Summary
Anomalies / Warnings
Diagnostics
Stress-Test Entry Point
```

Only display sections for data actually returned.

---

# 34. MILP Results Contract Placeholder

The exact MILP Results JSON contract is **not finalised yet**.

Do not hard-code a speculative result schema throughout the frontend.

Create a thin adapter / type boundary so the actual contract can be added later.

Recommended approach:

```text
types/milp-results.ts
```

or equivalent.

For now:

- preserve existing result components where possible;
- isolate result data mapping;
- avoid scattering property names across many components;
- keep the result-rendering layer easy to update.

The final MILP Results JSON contract will be added very soon after the teams agree on it.

---

# 35. Existing Results Components

Where existing frontend components already display:

```text
source allocations
blend percentages
costs
constraints
solver status
warnings
```

preserve them if they remain useful.

Refactor their data source so they receive data from:

```http
GET /api/runs/:runId/results
```

rather than mock/static/local model data.

---

# 36. AI Analysis

Use:

```http
GET /api/runs/:runId/ai-analysis
```

Current AI responsibilities:

```text
summary
anomalies
warnings derived from anomalies
```

The structure should remain extensible for future additions.

Potential future sections:

```text
recommendations
trade-offs
resilience insights
critical constraints
scenario comparisons
```

Do not make the frontend require those future fields yet.

---

# 37. AI Summary Component

Create or reuse a component such as:

```text
AIAnalysisSummary
```

It should render:

```text
summary text
analysis status
optional metadata if returned
```

Keep it independent from the raw MILP result component.

---

# 38. Anomaly / Warning Component

Create or reuse a component such as:

```text
AnomalyList
```

Each item may eventually include:

```text
type
severity
message
related entity
```

Do not assume warnings are manually entered.

Warnings are expected to arise from detected anomalies / interpretation.

---

# 39. Infeasible Runs

An infeasible scenario is **not** a technical error.

Do not render the normal generic error page.

Instead:

```text
MILP status = infeasible
↓
diagnostics run
↓
AI explains diagnostics
↓
frontend shows decision-support result
```

Recommended title:

```text
Scenario Infeasible
```

Recommended sections:

```text
Why This Scenario Is Infeasible
Likely Causes
Affected Sources / Plants / Links
Suggested Investigation
```

Use backend diagnostic data.

---

# 40. Diagnostics Endpoint

Use:

```http
GET /api/runs/:runId/diagnostics
```

Potential diagnostic causes include:

```text
insufficient source supply
insufficient plant capacity
source outage
source → plant bottleneck
plant → zone bottleneck
quality restriction
constraint conflict
```

Do not implement client-side diagnosis logic.

The frontend only visualises diagnostics supplied by the backend.

---

# 41. Failed Runs

A failed run means a technical execution problem.

Examples:

```text
solver process error
timeout
backend failure
invalid internal data
```

UI should show:

```text
Optimisation Failed
```

and potentially:

```text
Retry
Return to Scenario
```

Do not run or show normal AI result content for a technical failure unless the backend explicitly provides it.

---

# 42. Stress Testing

Route:

```text
/runs/:runId/stress-testing
```

This feature sits around an existing scenario/run.

It is not the same as normal optimisation.

The user intentionally asks the system to test variations.

Potential controls:

```text
Increase demand
Reduce plant capacity
Disable source
Reduce link capacity
Apply stricter quality limits
```

---

# 43. Stress-Test Creation

Endpoint:

```http
POST /api/runs/:runId/stress-tests
```

Potential request configuration:

```text
Demand +10%
Demand +20%
Source A unavailable
Plant 1 capacity -20%
```

Do not run these variations inside the frontend.

The backend / stress-testing framework performs the runs.

---

# 44. Stress-Test Results

Use:

```http
GET /api/runs/:runId/stress-tests
GET /api/stress-tests/:stressTestId
```

Recommended frontend display:

```text
Test
Scenario Change
Feasible / Infeasible
Objective Change
Critical Constraint
```

Potential table:

```text
Base                  Feasible
Demand +10%           Feasible
Demand +20%           Infeasible
Source A unavailable  Infeasible
```

---

# 45. Backend API Contract

The frontend should be built against these proposed backend endpoints.

## Reference Data

```http
GET /api/sources
GET /api/plants
GET /api/demand-zones
GET /api/network-links
GET /api/quality-profiles
```

## Scenarios

```http
POST   /api/scenarios
GET    /api/scenarios
GET    /api/scenarios/:scenarioId
PUT    /api/scenarios/:scenarioId
DELETE /api/scenarios/:scenarioId
POST   /api/scenarios/:scenarioId/validate
```

## Runs

```http
POST /api/scenarios/:scenarioId/runs
GET  /api/scenarios/:scenarioId/runs
GET  /api/runs/:runId
GET  /api/runs/:runId/results
GET  /api/runs/:runId/ai-analysis
GET  /api/runs/:runId/diagnostics
```

## Stress Testing

```http
POST /api/runs/:runId/stress-tests
GET  /api/runs/:runId/stress-tests
GET  /api/stress-tests/:stressTestId
```

Treat these as the integration target unless the backend team changes the final path names.

---

# 46. Frontend API Layer

Do not call `fetch()` randomly throughout components.

Create or preserve a structured API layer.

Recommended modules:

```text
referenceDataApi
scenarioApi
runApi
analysisApi
stressTestApi
```

---

# 47. referenceDataApi

Suggested functions:

```typescript
getSources()
getPlants()
getDemandZones()
getNetworkLinks()
getQualityProfiles()
```

Purpose:

Load data required to construct a scenario.

---

# 48. scenarioApi

Suggested functions:

```typescript
getScenarios()
getScenario(scenarioId)
createScenario(payload)
updateScenario(scenarioId, payload)
deleteScenario(scenarioId)
validateScenario(scenarioId)
```

---

# 49. runApi

Suggested functions:

```typescript
createRun(scenarioId)
getScenarioRuns(scenarioId)
getRun(runId)
getResults(runId)
```

---

# 50. analysisApi

Suggested functions:

```typescript
getAIAnalysis(runId)
getDiagnostics(runId)
```

---

# 51. stressTestApi

Suggested functions:

```typescript
createStressTest(runId, payload)
getRunStressTests(runId)
getStressTest(stressTestId)
```

---

# 52. Type Organisation

Create or preserve clear TypeScript contracts.

Possible structure:

```text
types/
  scenario.ts
  reference-data.ts
  run.ts
  milp-results.ts
  ai-analysis.ts
  diagnostics.ts
  stress-test.ts
```

Do not create one enormous global `types.ts` file if the project already supports domain separation.

---

# 53. Scenario Form State

The scenario form should model user-editable data rather than the complete canonical backend dataclass.

Example frontend form state:

```typescript
type ScenarioFormState = {
  scenarioName: string;
  description: string;

  sources: ScenarioSourceSelection[];
  plants: ScenarioPlantSelection[];
  demandZones: ScenarioDemandSelection[];

  qualityProfileId: string | null;

  networkOverrides: NetworkOverride[];
};
```

The exact naming should follow existing project conventions.

---

# 54. Avoid Mirroring the Full SourceInput in Form State

Do not store a fully duplicated editable copy of:

```text
name
source_type
fixed_activation_cost
cost_per_ml
quality
provenance
```

inside each scenario selection if those are reference values.

Prefer:

```text
source_id
enabled
overrides
```

and separately cache/reference the source metadata.

This avoids stale duplicated data.

---

# 55. Reference Data State

Reference data should be fetched and treated as display/context data.

For example:

```text
sourcesById
plantsById
zonesById
links
qualityProfiles
```

Scenario selections can reference those IDs.

This mirrors the DRY / single-source-of-truth architecture.

---

# 56. Suggested Reusable Components

Claude should inspect existing components first.

Add/reuse components approximately equivalent to:

```text
ScenarioForm
ScenarioDetailsSection
SourceSelectionTable
PlantSelectionTable
DemandZoneEditor
QualityProfileSelector
AdvancedNetworkOverrides
ValidationSummary

ScenarioCard
ScenarioStatusBadge
RunHistoryTable

RunStatus
RunProgress

ResultsSummary
SourceAllocationTable
PlantUtilisation
DemandFulfilment
NetworkFlowView
QualityResults

AIAnalysisSummary
AnomalyList
DiagnosticPanel

StressTestForm
StressTestResults
```

Names may change to match repository conventions.

---

# 57. Component Responsibility Rule

Keep components focused.

For example:

```text
SourceSelectionTable
```

should not:

- call the MILP;
- fetch AI analysis;
- contain run orchestration;
- perform backend-level validation.

It should display source reference data and collect user scenario selections.

---

# 58. Recommended Scenario Builder Composition

Conceptually:

```tsx
<ScenarioForm>
  <ScenarioDetailsSection />
  <SourceSelectionTable />
  <PlantSelectionTable />
  <DemandZoneEditor />
  <QualityProfileSelector />
  <AdvancedNetworkOverrides />
  <ValidationSummary />
</ScenarioForm>
```

Do not copy this literally if the existing component library uses another pattern.

---

# 59. Loading States

Every backend-driven page must have a defined loading state.

Important cases:

```text
loading reference data
loading scenario
saving scenario
validating scenario
creating run
loading run
solving
loading results
loading AI analysis
loading diagnostics
running stress tests
```

Avoid blank pages.

---

# 60. Empty States

Define useful empty states.

Examples:

## No scenarios

```text
No scenarios yet.
Create your first Aqua Blend scenario.
```

## No runs

```text
This scenario has not been optimised yet.
```

## No anomalies

```text
No significant anomalies were detected.
```

## No diagnostics

Do not show a diagnostics panel if the run is not infeasible.

---

# 61. Error States

The frontend should distinguish between:

```text
reference-data load failure
scenario validation failure
scenario save failure
run creation failure
solver technical failure
AI analysis failure
diagnostics failure
stress-test failure
```

Do not display every error as:

```text
Something went wrong
```

Use context-specific messaging.

---

# 62. Validation Failure Is Not a System Error

Example:

```text
Demand must be greater than zero.
```

This should be shown inline in the scenario form.

Do not route the user to an error page.

---

# 63. Infeasibility Is Not a System Error

Example:

```text
Scenario is mathematically infeasible.
```

This is a valid model outcome.

Render diagnostics and explanation.

---

# 64. API Failure Is a System Error

Example:

```text
Could not reach optimisation service.
```

This is a technical failure.

Provide appropriate retry behaviour.

---

# 65. Run History

Scenario overview should support historical runs.

Endpoint:

```http
GET /api/scenarios/:scenarioId/runs
```

Recommended columns:

```text
Run ID
Created At
Status
Solver Status
Total Cost if available
View Results
```

Avoid exposing long raw UUIDs prominently if a friendlier run label is available.

---

# 66. Scenario Version Safety

When a run starts, the backend should preserve the exact scenario used.

The frontend must not assume that editing a scenario changes historical run data.

Display results based on:

```text
run_id
```

not whatever the current editable scenario looks like.

---

# 67. Results Data Joining

The MILP result may return identifiers rather than repeated names.

Example concept:

```text
MILP Result:
source_id = SRC_001
allocation = 70

Reference Data:
SRC_001 = Source A
```

The frontend may display:

```text
Source A
70 ML/day
```

Use canonical reference data or backend-enriched result responses to resolve labels.

Do not require the MILP to duplicate metadata purely for frontend convenience.

---

# 68. Single Source of Truth

Keep this principle throughout the frontend:

```text
Supabase / Backend
= canonical reference data

Scenario
= scenario-specific conditions

MILP Result
= optimisation decisions

AI
= interpretation
```

Do not mix these domains in form state or component logic.

---

# 69. Results Visualisation

Preserve existing useful visualisations if present.

Potential result visualisations:

```text
Source Allocation
Plant Utilisation
Demand Fulfilment
Cost Breakdown
Blend Composition
Constraint / Capacity Indicators
Quality Outcome
```

Do not invent unavailable data.

If the backend does not provide a metric yet, hide that component or use a development placeholder clearly labelled as such.

---

# 70. No Fake Production Data

Do not permanently hard-code fake optimisation values to make pages look complete.

Mock data may be used during development, but it must be isolated.

Recommended:

```text
mocks/
```

or a clearly controlled mock adapter.

Make it easy to switch to real API data.

---

# 71. Development API Adapter

Because some backend endpoints may still be under construction, the frontend may use an adapter interface.

Example:

```text
ScenarioRepository
RunRepository
```

or API service wrappers.

The actual UI should not care whether the data comes temporarily from mocks or the live backend.

---

# 72. Do Not Directly Access Supabase from Scenario Components

The agreed architecture is:

```text
Frontend
↓
Backend
↓
Supabase
```

Therefore scenario components should not perform direct Supabase table queries for core workflow data.

The backend should expose the reference-data endpoints.

This keeps:

```text
validation
permissions
data shaping
orchestration
```

centralised.

---

# 73. Authentication

Preserve the existing authentication approach if the frontend already has one.

Do not redesign authentication as part of this refactor unless integration requires it.

Ensure API wrappers can include existing auth tokens/credentials.

---

# 74. Styling

Preserve the current Aqua Blend visual language unless there is an obvious usability issue.

Do not perform a wholesale redesign just because the routing changes.

Priority order:

```text
1. Correct architecture
2. Functional integration
3. Clear scenario UX
4. Consistent existing styling
5. Further visual polish
```

---

# 75. Responsive Behaviour

Scenario tables and results should remain usable on smaller screens.

If a table becomes too wide:

- use horizontal scrolling;
- collapse secondary metadata;
- use cards on mobile where appropriate.

Do not hide mandatory inputs.

---

# 76. Accessibility

Use:

```text
proper labels
keyboard-accessible controls
button states
aria labels where necessary
clear error messages
sufficient semantic structure
```

Avoid using colour alone to indicate:

```text
ready
warning
infeasible
failed
```

---

# 77. Scenario Status Badge

Create a reusable badge mapping.

Conceptually:

```text
draft
ready
validation_failed
```

Do not couple styling directly to raw strings in multiple files.

Use one central mapping.

---

# 78. Run Status Badge

Likewise for:

```text
queued
solving
diagnosing
analysing
completed
infeasible
failed
```

Keep status-to-label/status-to-icon mapping centralised.

---

# 79. Buttons and State Protection

Disable buttons when actions are invalid.

Examples:

```text
Run Optimisation disabled if scenario is not ready
Save disabled while save request is pending
Run disabled while createRun request is pending
Stress Test disabled if no suitable base run exists
```

Prevent accidental duplicate runs caused by double-clicks.

---

# 80. Confirmation Behaviour

Avoid unnecessary confirmation dialogs for normal navigation.

Consider confirmation only for destructive actions such as:

```text
Delete Scenario
Discard unsaved changes
```

Do not require confirmation to run ordinary validation.

---

# 81. Backend Validation Response

The frontend should be able to render a response equivalent to:

```json
{
  "scenario_id": "scenario_001",
  "is_ready": false,
  "validation_issues": [
    "ZONE_001 has no enabled route from an available source."
  ]
}
```

Do not require this exact envelope if the final backend differs.

Build a small mapping layer.

---

# 82. Scenario Creation Success

After successful creation:

```text
Scenario saved
```

Then either:

- stay on scenario overview; or
- navigate to `/scenarios/:scenarioId`.

Preferred:

```text
navigate to scenario overview
```

so the user can review readiness and then run optimisation.

---

# 83. Do Not Immediately Run MILP When Scenario Is Created

This is important.

Creating a scenario and running a scenario are two different actions.

Do not automatically trigger optimisation on:

```http
POST /api/scenarios
```

unless product requirements later explicitly change.

The intended UX is:

```text
Create / Save Scenario
↓
Review / Validate
↓
Run Optimisation
```

---

# 84. Run Optimisation Button Placement

Show it prominently on:

```text
Scenario Overview
```

Potentially also show it on scenario list rows.

However, the overview page should be the primary location.

Button state:

```text
Ready → enabled
Not Ready → disabled
```

When disabled, explain why.

---

# 85. Run Progress Navigation

Once a run begins:

```text
/scenarios/:scenarioId
↓
POST run
↓
/runs/:runId
```

When completed:

```text
/runs/:runId/results
```

The app may automatically navigate from run-progress to results once completed.

Do not automatically redirect on failed status.

---

# 86. AI Failure After Successful MILP

If MILP succeeds but AI fails, do not hide the optimisation result.

Render:

```text
MILP Results
```

and separately show:

```text
AI analysis unavailable
```

The architecture should allow partial success.

---

# 87. Diagnostics Failure After Infeasible MILP

Likewise, if the solver reports infeasible but diagnostics fail:

```text
Scenario Infeasible
```

should still be shown.

Then display:

```text
Detailed diagnostics unavailable.
```

Do not convert it into a generic solver failure.

---

# 88. Data Fetch Strategy

Use the project's existing preferred data-fetching pattern.

If the project already uses:

```text
React Query
SWR
server components
custom hooks
```

preserve that pattern where reasonable.

Do not introduce a new state library without need.

---

# 89. Suggested Query Keys

If using a query library, organise keys conceptually by domain:

```text
sources
plants
demandZones
networkLinks
qualityProfiles

scenarios
scenario/{id}
scenario/{id}/runs

run/{id}
run/{id}/results
run/{id}/ai
run/{id}/diagnostics
run/{id}/stress-tests
```

---

# 90. Suggested Hooks

If consistent with the existing project:

```text
useSources()
usePlants()
useDemandZones()
useNetworkLinks()
useQualityProfiles()

useScenarios()
useScenario(id)
useScenarioRuns(id)

useRun(id)
useRunResults(id)
useAIAnalysis(id)
useDiagnostics(id)
```

Do not create redundant hooks if the repository already has an equivalent abstraction.

---

# 91. Form Library

Use the existing form approach if one exists.

If the current frontend already uses:

```text
React Hook Form
Formik
native controlled inputs
```

preserve it unless there is a clear architectural problem.

Do not perform unrelated framework migration.

---

# 92. Client-Side Validation Schema

Where useful, define scenario form validation centrally.

Possible concepts:

```text
Scenario name required
Demand > 0
Override values >= 0
At least one source
At least one plant
Quality profile required
```

Do not reproduce backend model rules that require database context.

---

# 93. Backend Error Format Adapter

Create one place to convert API errors into frontend-friendly messages.

For example:

```text
ApiError
ValidationError
RunError
```

Avoid parsing raw error messages separately in many components.

---

# 94. Run Result Types Must Be Isolated

Because the exact MILP Results JSON is pending:

- create a dedicated result type file;
- create a dedicated API mapper;
- keep visual components dependent on view models where practical.

Example concept:

```text
raw MILP result
↓
mapMilpResultToViewModel()
↓
Results components
```

This will minimise future changes.

---

# 95. AI Types Must Also Be Isolated

Likewise:

```text
AIAnalysisResponse
Anomaly
```

should live in their own domain type.

Do not mix them into the scenario type.

---

# 96. Diagnostics Types Must Be Isolated

Potential conceptual shape:

```text
DiagnosticCause
DiagnosticSeverity
DiagnosticEntityReference
```

Use actual backend schema when finalised.

---

# 97. Stress-Test Types Must Be Isolated

Separate:

```text
StressTestRequest
StressTestRun
StressTestResult
```

from normal optimisation run types.

A stress test is not just another frontend form flag.

---

# 98. Recommended Implementation Order

Claude should make the frontend changes in this order.

## Phase 1 — Repository Audit

Inspect:

```text
current routes
existing components
API services
state management
types
auth
styles
mock data
result components
AI components
error/loading components
```

Create a short internal mapping of what can be reused.

Do not start deleting code immediately.

## Phase 2 — Domain Types

Add/refactor:

```text
reference data types
scenario types
run types
AI types
diagnostic types
stress-test types
```

Keep MILP result type isolated because the final contract is pending.

## Phase 3 — API Layer

Implement wrappers for:

```text
reference-data endpoints
scenario endpoints
run endpoints
analysis endpoints
diagnostic endpoints
stress-test endpoints
```

Use the existing HTTP client pattern.

## Phase 4 — Scenario Builder

Implement:

```text
scenario details
source selection
plant selection
demand zones
quality profile
advanced network overrides
validation summary
```

## Phase 5 — Scenario Pages

Implement/refactor:

```text
/scenarios
/scenarios/new
/scenarios/:scenarioId
/scenarios/:scenarioId/edit
```

## Phase 6 — Run Creation

Connect:

```text
Run Optimisation
```

to:

```http
POST /api/scenarios/:scenarioId/runs
```

## Phase 7 — Run Progress

Implement:

```text
/runs/:runId
```

with status handling.

## Phase 8 — Results Integration

Refactor existing results components to use:

```http
GET /api/runs/:runId/results
```

Keep raw result schema isolated.

## Phase 9 — AI / Anomalies

Integrate:

```http
GET /api/runs/:runId/ai-analysis
```

## Phase 10 — Infeasibility Diagnostics

Integrate:

```http
GET /api/runs/:runId/diagnostics
```

## Phase 11 — Stress Testing

Add:

```text
/runs/:runId/stress-testing
```

and related endpoints.

## Phase 12 — Cleanup

Remove:

- obsolete mock flows;
- duplicated old API calls;
- direct MILP calls;
- direct scenario-to-AI calls;
- unused components only after confirming they are no longer referenced.

---

# 99. What Claude Must Not Do

Do not:

```text
rebuild the entire frontend without first inspecting it
delete reusable working visualisations
directly call MILP from React
directly call AI from React
make Supabase the direct scenario workflow client
treat every ScenarioData field as a user form field
let the user choose solved water flows
let the user manually create physical network topology
hard-code the final MILP Results JSON before it is agreed
combine scenario creation and optimisation into one unavoidable action
treat infeasible as a technical error
run client-side infeasibility diagnostics
duplicate source/plant metadata in scenario state unnecessarily
introduce a new global state library without need
replace the existing styling system without reason
```

---

# 100. What Claude Should Preserve

Preserve where useful:

```text
existing visual design
existing responsive components
existing result charts/tables
existing AI explanation UI
existing warning UI
existing solver-status components
existing error/loading patterns
existing authentication
existing HTTP utility
existing design system
existing navigation shell
```

Refactor data flow rather than recreating everything.

---

# 101. Acceptance Criteria — Scenario Builder

The scenario builder is complete when:

- user can create a scenario name;
- user can optionally add description;
- sources load from backend;
- user can enable relevant sources;
- source overrides are optional;
- plants load from backend;
- user can enable relevant plants;
- demand zones load from backend;
- user can enter demand;
- quality profiles load from backend;
- network topology comes from backend;
- network changes are advanced overrides only;
- frontend validation works;
- scenario can be submitted to backend;
- backend validation issues can be displayed.

---

# 102. Acceptance Criteria — Scenario Lifecycle

Complete when:

```text
Create
Save
Validate
Edit
View
Run
```

are separate, clear actions/states.

A scenario must be able to exist without having been run.

---

# 103. Acceptance Criteria — Optimisation Run

Complete when:

- ready scenario can create a run;
- run receives a `run_id`;
- duplicate submissions are prevented;
- frontend navigates to run status;
- run status updates;
- completion can navigate to results;
- failure is handled;
- infeasible status is handled separately.

---

# 104. Acceptance Criteria — Results

Complete when:

- existing useful result components are preserved/refactored;
- result data comes from backend;
- no final result schema is hard-coded across the app;
- source IDs can be rendered with friendly labels;
- AI section is separate from raw solver results;
- anomaly/warning section is separate;
- partial failure does not hide successful MILP output.

---

# 105. Acceptance Criteria — Diagnostics

Complete when:

- infeasible runs are not shown as crashes;
- diagnostics are requested from backend;
- likely causes can be displayed;
- AI explanation can be displayed;
- unavailable diagnostics have a graceful fallback.

---

# 106. Acceptance Criteria — Stress Testing

Complete when:

- user can configure supported stress-test variations;
- request goes through backend;
- frontend does not execute MILP;
- status/results can be viewed;
- feasible/infeasible variations can be compared.

---

# 107. Recommended User Journey

## First-time scenario

```text
Dashboard
↓
Create Scenario
↓
Scenario Details
↓
Sources
↓
Plants
↓
Demand Zones
↓
Quality Profile
↓
Optional Advanced Overrides
↓
Save
↓
Backend Validation
↓
Scenario Ready
↓
Run Optimisation
↓
Run Progress
↓
MILP
↓
AI / Diagnostics
↓
Results
```

---

# 108. Example Normal Scenario

The user creates:

```text
Scenario Name:
High Demand Summer Case

Sources:
Source A enabled
Source B enabled

Plant:
Plant 1 enabled

North Zone Demand:
120 ML/day

Quality:
Standard Profile
```

The frontend sends user choices.

The backend retrieves:

```text
source metadata
plant metadata
network topology
capacity
cost
quality data
availability
provenance
```

and builds canonical `ScenarioData`.

The user then separately presses:

```text
Run Optimisation
```

The MILP decides:

```text
actual source allocation
actual plant throughput
actual link flows
optimal objective
feasibility
```

These are not user inputs.

---

# 109. Example Infeasible Scenario

User asks for a scenario that cannot satisfy demand.

Frontend behaviour:

```text
Run Optimisation
↓
Status: Solving
↓
Status: Infeasible / Diagnosing
↓
Diagnostics
↓
AI explanation
↓
Results page
```

Results page should explain the model outcome rather than displaying a red generic crash page.

---

# 110. Example Failed Scenario Run

Technical solver error:

```text
Run Optimisation
↓
Status: Solving
↓
Status: Failed
```

Frontend:

```text
Optimisation Failed
Retry
Return to Scenario
```

Do not display fabricated diagnostics.

---

# 111. Example Scenario Re-Run

A user may:

```text
Open Scenario
↓
Run Optimisation
↓
Run 001

Later
↓
Open same Scenario
↓
Run Optimisation
↓
Run 002
```

Run history should preserve both.

Do not overwrite Run 001.

---

# 112. Relationship Between Scenario and Run

Keep this mental model:

```text
Scenario
= What conditions should be tested?

Run
= One execution of the optimiser using those conditions.

Results
= What the optimiser produced.

AI Analysis
= What those results mean.

Diagnostics
= Why an infeasible scenario failed.

Stress Test
= How the scenario behaves under controlled changes.
```

---

# 113. Final Frontend Architecture

```text
                         ┌────────────────────┐
                         │      Dashboard     │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │     Scenarios      │
                         └─────────┬──────────┘
                                   │
                         Create / View / Edit
                                   │
                                   ▼
                         ┌────────────────────┐
                         │  Scenario Builder  │
                         └─────────┬──────────┘
                                   │
                              Save / Validate
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ Scenario Overview  │
                         └─────────┬──────────┘
                                   │
                            Run Optimisation
                                   │
                                   ▼
                         ┌────────────────────┐
                         │     Run Status     │
                         └─────────┬──────────┘
                                   │
                   ┌───────────────┼────────────────┐
                   │               │                │
                   ▼               ▼                ▼
               Feasible        Infeasible          Failed
                   │               │                │
                   │          Diagnostics           │
                   │               │                │
                   └───────┬───────┘                │
                           ▼                        │
                          AI                        │
                           │                        │
                           ▼                        ▼
                     Results Page              Error State
                           │
                           ▼
                    Stress Testing
```

---

# 114. Final API Map

```text
REFERENCE DATA
GET /api/sources
GET /api/plants
GET /api/demand-zones
GET /api/network-links
GET /api/quality-profiles

SCENARIOS
POST   /api/scenarios
GET    /api/scenarios
GET    /api/scenarios/:scenarioId
PUT    /api/scenarios/:scenarioId
DELETE /api/scenarios/:scenarioId
POST   /api/scenarios/:scenarioId/validate

RUNS
POST /api/scenarios/:scenarioId/runs
GET  /api/scenarios/:scenarioId/runs
GET  /api/runs/:runId
GET  /api/runs/:runId/results
GET  /api/runs/:runId/ai-analysis
GET  /api/runs/:runId/diagnostics

STRESS TESTING
POST /api/runs/:runId/stress-tests
GET  /api/runs/:runId/stress-tests
GET  /api/stress-tests/:stressTestId
```

---

# 115. Final Rules Claude Must Keep in Mind

## Rule 1

The frontend defines the scenario.

The MILP solves the scenario.

Do not mix these responsibilities.

## Rule 2

The user does not fill every `ScenarioData` field.

The backend creates the complete canonical object using user selections + Supabase + system fields.

## Rule 3

Creating a scenario is separate from running optimisation.

## Rule 4

The frontend calls the backend only.

Backend orchestration decides when to call MILP, diagnostics and AI.

## Rule 5

Physical network topology normally comes from Supabase.

The MILP decides actual water flows.

## Rule 6

An infeasible solution is a valid optimisation result.

It is not equivalent to a technical failure.

## Rule 7

Do not hard-code the final MILP output schema yet.

The final contract will be added soon.

## Rule 8

Preserve useful existing frontend work.

Refactor integration and page flow rather than rebuilding everything without reason.

## Rule 9

Keep data ownership DRY.

IDs should reference canonical metadata rather than copying names/costs/units into every payload.

## Rule 10

Every required canonical ScenarioData field must be populated before optimisation.

If it cannot be populated:

```text
validation issue
↓
scenario not ready
↓
Run Optimisation blocked
```

---

# 116. Expected Outcome After Refactor

After completing this refactor, Aqua Blend should support the following clean user experience:

```text
Create Scenario
↓
Configure Scenario
↓
Save Scenario
↓
Validate Scenario
↓
Run Optimisation
↓
Track Run
↓
View MILP Result
↓
View AI Summary
↓
View Anomalies
↓
View Diagnostics if Infeasible
↓
Optionally Run Stress Tests
```

The frontend should remain presentation- and interaction-focused.

The backend should remain the orchestration layer.

Supabase should remain the persistent source of truth.

The MILP should remain responsible for mathematical optimisation.

The AI layer should remain responsible for interpreting results.

The diagnostic/stress-testing framework should remain an external decision-support layer around the existing MILP.
