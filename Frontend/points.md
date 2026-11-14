# AquaBlend Frontend Routes and Interaction Points

## 1. Purpose

This document defines the **frontend-only route structure and interaction points** for AquaBlend.

It is intended for React / Next.js implementation and for use with Claude Code.

Important:
- This document does **not** define backend API implementation.
- It does **not** define database endpoints.
- It does **not** define Entity Framework routes.
- It does **not** define MILP solver endpoints.

Where the frontend needs upstream data, this document specifies the **frontend action / service requirement**, not the backend implementation details.

## 2. Recommended Next.js Route Map

```text
/
├── /optimise
├── /results
│   └── /results/[resultId]
├── /sources
├── /system-flow
└── /about
```

If the application is intended to remain extremely small, `/` may redirect directly to `/optimise`.

## 3. `/optimise`

### Purpose

Primary AquaBlend working page.

This route should contain:
- natural-language optimisation input;
- scenario selection;
- optional advanced scenario controls;
- run optimisation action;
- current solver status;
- final MILP result;
- AI explanation.

This is the most important frontend route.

### Main UI Sections

```text
OptimisePage
├── OptimisationInput
├── ScenarioSelector
├── AdvancedOptions
├── OptimisationActions
├── OptimisationStatus
├── ResultsSummary
├── SourceResults
├── NetworkResults
├── DemandResults
├── QualityResults
├── CostBreakdown
├── DecisionEvidence
├── AIExplanation
└── WarningList
```

## 4. `/results`

### Purpose

Display previously available optimisation results.

Recommended fields in list view:
- result ID
- scenario ID
- scenario name
- solver status
- objective / total cost
- solve time if available
- created/run timestamp if available
- warning count

Recommended filters:
- scenario
- solver status
- date
- optimal / infeasible

Recommended actions:
- open result
- return to optimise
- rerun scenario only if supported by the frontend workflow

## 5. `/results/[resultId]`

### Purpose

Dedicated detailed view for one solved scenario.

Recommended sections:
1. solver status;
2. scenario information;
3. result summary;
4. selected / unused sources;
5. plant results;
6. source-to-plant flows;
7. plant-to-zone flows;
8. demand results;
9. blended quality;
10. cost breakdown;
11. constraint / decision evidence;
12. AI explanation;
13. warnings / notes.

The result page should be renderable directly from the external solved-result contract.

It should not require knowledge of internal MILP variable names.

## 6. `/sources`

### Purpose

Frontend view of water-source information available to the user.

This should be read-only unless source editing becomes an explicitly supported product requirement.

Recommended visible fields:
- source ID
- source name
- source type
- availability status
- model readiness
- maximum availability / capacity where provided
- source cost where provided
- quality summary
- estimated-data indicator
- provenance indicator

Recommended filters:
- source type
- availability
- model ready
- estimated / measured

This page is primarily for transparency and scenario understanding.

## 7. `/system-flow`

### Purpose

Explain AquaBlend's system-level information flow.

Recommended representation:

**Data Science → Shared Contracts → MILP → Backend → AI → Frontend**

For frontend purposes, this page should explain:
- where scenario data originates;
- that MILP produces deterministic optimisation results;
- that AI explains those results;
- that the frontend displays both solver facts and AI explanation separately.

Recommended content:
- high-level data-level diagram;
- short descriptions of each stage;
- contract names where appropriate.

Do not expose implementation secrets or raw database configuration.

## 8. `/about`

### Purpose

Provide project context and user-facing explanation.

Recommended sections:
- what AquaBlend does;
- what optimisation considers;
- meaning of selected sources / blend;
- difference between MILP result and AI explanation;
- limitations / disclaimer for non-operational or test scenarios.

## 9. Frontend Interaction Points

These are **frontend service actions**, not backend route definitions.

Claude Code should implement these behind a central service / client abstraction.

Suggested conceptual interface:

```ts
interface AquaBlendClient {
  getScenarios(): Promise<ScenarioSummary[]>;
  getScenario(id: string): Promise<ScenarioDetail>;

  submitOptimisation(
    request: OptimisationRequest
  ): Promise<OptimisationSubmission>;

  getOptimisationStatus(
    resultId: string
  ): Promise<OptimisationStatus>;

  getOptimisationResult(
    resultId: string
  ): Promise<SolvedScenario>;

  getResults(
    filters?: ResultFilters
  ): Promise<ResultSummary[]>;

  getSources(
    filters?: SourceFilters
  ): Promise<SourceSummary[]>;

  getAIExplanation(
    resultId: string
  ): Promise<AIExplanationResult>;
}
```

The exact transport URLs are deliberately excluded from this frontend specification.

## 10. Interaction Point: Scenario List

### Frontend requirement

Retrieve scenarios available for optimisation.

Expected frontend fields:
- `scenario_id`
- `scenario_name`
- status
- description where available

Used by:
- `/optimise`
- scenario selector

States:
- loading
- loaded
- empty
- failed

## 11. Interaction Point: Scenario Detail

### Frontend requirement

Retrieve enough scenario information to show the user what is being optimised.

Potential fields:
- scenario ID
- name
- description
- source count
- plant count
- demand-zone count
- demand summary
- quality-limit summary

The frontend should not duplicate scenario validation logic.

## 12. Interaction Point: Submit Optimisation

### Frontend request model

Recommended conceptual payload:

```ts
interface OptimisationRequest {
  scenarioId: string;
  requestText?: string;
  options?: OptimisationOptions;
}
```

Do not include fields that are not actually supported by the application contract.

### Frontend response expectation

At minimum:
- result / job identifier
- submission status

The UI should then transition to queued/running state.

## 13. Interaction Point: Optimisation Status

Expected frontend fields:
- result ID
- scenario ID
- solver / job state
- optional progress message
- optional solve time
- optional error

Recognised frontend states:
- queued
- running
- optimal
- infeasible
- failed

The frontend should poll only through a central service function rather than implementing polling independently in multiple components.

## 14. Interaction Point: Solved Result

This is the primary contract consumed by the frontend.

Recommended top-level structure:

```text
SolvedScenario
├── scenario_id
├── description
├── solver
├── sources
├── network
├── blended_quality
├── cost_breakdown
├── warnings
└── notes
```

## 15. Solved Result Fields

### `solver`

Expected:
- `status`
- `objective_value`

Potential additional frontend fields when contract supports them:
- solve time
- feasibility flag
- optimality flag

### `sources.selected[]`

Expected:
- `source_id`
- `is_selected`
- `withdrawal_ml_per_day`
- `blend_ratio`
- `fixed_cost_contribution`
- `withdrawal_cost_contribution`

Recommended additions when agreed:
- maximum capacity / withdrawal
- utilisation
- model readiness
- estimated-data flag
- provenance
- deterministic decision evidence

### `sources.unused[]`

Expected:
- same source identity
- selected state false
- zero / absent solved withdrawal as defined by contract

Recommended additions:
- reason code
- deterministic reason
- availability / quality metadata where useful

### `network.plants[]`

Expected:
- `plant_id`
- `is_active`
- `throughput_ml_per_day`
- `fixed_cost_contribution`
- `treatment_cost_contribution`

Recommended additions:
- capacity
- utilisation

### `network.demand_zones[]`

Expected:
- `zone_id`
- `demand_ml_per_day`
- `delivered_ml_per_day`

Recommended additions:
- demand satisfied
- unmet demand
- surplus

### `network.source_to_plant_flows[]`

Expected:
- `source_id`
- `plant_id`
- `is_active`
- `flow_ml_per_day`

### `network.plant_to_zone_flows[]`

Expected:
- `plant_id`
- `zone_id`
- `is_active`
- `flow_ml_per_day`

### `blended_quality.results[]`

Expected:
- `plant_id`
- `parameter_id`
- `unit`
- `blended_value`
- `lower_limit`
- `upper_limit`
- `lower_margin`
- `upper_margin`
- `is_binding`

### `cost_breakdown`

Expected:
- `total_source_fixed_cost`
- `total_source_withdrawal_cost`
- `total_plant_fixed_cost`
- `total_plant_treatment_cost`
- `reconstructed_total_cost`
- `solver_objective_value`
- `cost_reconciles`

### `warnings`

Expected:
- string array or agreed warning object structure

Frontend behaviour:
- empty = no visible warning block;
- non-empty = render warning section.

### `notes`

Used for:
- scenario limitations;
- test-data disclaimers;
- unsupported-treatment notes;
- validation / verification status.

Do not render every note as a critical warning.

## 16. Interaction Point: AI Explanation

### Purpose

Retrieve or receive the human-readable explanation attached to an optimisation result.

Recommended conceptual type:

```ts
interface AIExplanationResult {
  resultId: string;
  status: "ready" | "pending" | "failed" | "fallback";
  explanation: string | null;
  confidence?: string | number | null;
  evidenceFlags?: string[];
  warnings?: string[];
}
```

The frontend should clearly label this as an **AI Explanation**.

The frontend must not merge this text into deterministic solver values.

## 17. Interaction Point: Sources

Expected source-summary fields where available:
- source ID
- name
- source type
- availability
- `model_ready`
- cost
- capacity
- quality summary
- estimated flags
- provenance

The frontend should consume these as display data only.

## 18. Frontend Polling Behaviour

Where asynchronous optimisation is used:

Recommended behaviour:
1. submit;
2. receive result/job ID;
3. poll central status function;
4. stop polling on terminal state;
5. fetch solved result;
6. fetch AI explanation when available.

Terminal states:
- optimal
- infeasible
- failed

Do not create multiple polling loops in separate components.

## 19. Frontend Error Categories

The frontend should normalise upstream errors into user-facing categories:

```text
VALIDATION_ERROR
NOT_FOUND
UNAUTHORISED
FORBIDDEN
OPTIMISATION_INFEASIBLE
OPTIMISATION_FAILED
AI_EXPLANATION_FAILED
NETWORK_ERROR
UNKNOWN_ERROR
```

This is a frontend presentation model only.

It does not prescribe backend error codes.

## 20. Suggested Frontend Service Folder

```text
src/
├── app/
│   ├── optimise/
│   ├── results/
│   ├── sources/
│   ├── system-flow/
│   └── about/
├── components/
├── services/
│   ├── aquaBlendClient.ts
│   ├── optimisationService.ts
│   ├── resultService.ts
│   ├── scenarioService.ts
│   ├── sourceService.ts
│   └── aiExplanationService.ts
├── types/
│   ├── scenario.ts
│   ├── optimisation.ts
│   ├── solvedScenario.ts
│   ├── source.ts
│   └── ai.ts
└── utils/
    ├── formatters.ts
    ├── resultStatus.ts
    └── errorMapping.ts
```

This is a recommended frontend structure and can be adapted to the existing repository.

## 21. Route Guard / Authentication Awareness

If authentication exists upstream, the frontend may need to recognise user roles such as:
- Admin
- Analyst
- Viewer

However, this frontend document does not define JWT generation, policy enforcement, or backend authentication.

Frontend responsibility:
- show/hide actions based on authenticated role information supplied to it;
- redirect unauthenticated users where required;
- never treat client-side hiding as security enforcement.

## 22. Frontend Caching Guidance

Safe candidates for lightweight caching:
- scenario list
- source list
- completed result detail

Avoid treating cached status as authoritative while an optimisation is running.

Running solve status should remain refreshable.

## 23. URL State

Useful URL parameters may include:

```text
/optimise?scenario=<scenarioId>

/results?status=optimal

/results/<resultId>
```

Do not place sensitive or large scenario payloads in the URL.

## 24. Definition of Done — Frontend Routes

The frontend routing / interaction layer is complete when:

- `/optimise` supports scenario selection and optimisation submission;
- running state is represented;
- terminal solve states are handled;
- `/results` lists available results;
- `/results/[resultId]` renders the solved-result contract;
- `/sources` displays source information;
- AI explanation can be displayed separately from solver facts;
- errors are mapped to consistent user-facing states;
- polling is centralised;
- frontend TypeScript contracts are centralised;
- no component directly depends on PuLP variable names;
- no frontend component contains backend/database implementation logic.
