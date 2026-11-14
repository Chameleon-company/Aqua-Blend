# API Contract

## Overview

Grouped per `integration.md` §35: Reference Data, Scenarios, Runs, AI/Diagnostics, Stress
Testing. All responses use camelCase JSON. Errors thrown via `AquaBlend.Exceptions.ApiException`
(404/409/501) are returned as `application/problem+json` with a machine-readable `code` field
(`Backend/Middleware/ApiExceptionMiddleware.cs`); 400s come from standard `[ApiController]` model
validation (`ValidationProblemDetails`).

`scenarioId`, `runId`, `sourceId`, `plantId`, `zoneId`, `linkId`, `profileId` are all opaque
string identifiers (`Scenario.ExternalId` etc.) — never the internal database integer id.

## Reference Data

```http
GET /api/sources?sourceType=&availability=&modelReady=&estimatedOrMeasured=
GET /api/sources/{sourceId}
POST /api/sources
PUT  /api/sources/{sourceId}
DELETE /api/sources/{sourceId}
GET /api/plants
GET /api/demand-zones
GET /api/network-links
GET /api/quality-profiles
```

`network-links` returns a flat array combining both link kinds, each with a `kind` of
`"source_to_plant"` or `"plant_to_zone"` (matches `NetworkLinkRef` in the frontend).

## Scenarios

```http
GET    /api/scenarios
GET    /api/scenarios/{scenarioId}
POST   /api/scenarios
PUT    /api/scenarios/{scenarioId}
DELETE /api/scenarios/{scenarioId}
POST   /api/scenarios/{scenarioId}/validate
```

`POST`/`PUT` accept the full `ScenarioFormState` shape (scenarioName, description, sources,
plants, demandZones, qualityProfileId, networkOverrides) and both return the resulting
`ScenarioDetail` — `PUT` returns 200 with the updated resource, not 204, so the frontend never
needs a follow-up GET. Any edit resets `status` to `"draft"` and clears `validationIssues`;
`POST .../validate` is the only thing that can move a scenario to `"ready"`.

## Runs

```http
POST /api/scenarios/{scenarioId}/runs
GET  /api/scenarios/{scenarioId}/runs
GET  /api/runs/{runId}
GET  /api/runs/{runId}/results
```

`POST .../runs` requires the scenario to be `"ready"` (409 `RUN_CREATION_FAILED` otherwise).
**No MILP solver exists yet** — the run is genuinely created and persisted, then immediately
marked `workflow_status = "failed"` with `error_code = "SOLVER_NOT_IMPLEMENTED"`, per the
`failed` semantics in `integration.md` §16/§24, rather than rejecting the HTTP request. This
keeps create → poll → error-display real end-to-end today; see `Backend/Services/RunService.cs`.

`GET .../results` returns the raw solver JSON as stored (pass-through — the exact contract
isn't locked, see `integration.md` §15/§33) and 409s with `OPTIMISATION_FAILED` for a failed run.

### Result ingestion (what a real MILP service would call)

```http
POST /api/optimisation-results
```

Body: `{ runId, scenarioId, status, solvedAt?, contractVersion, totalCost?, currency?,
solveTimeMs?, result }` — `result` is the raw solver output, stored verbatim. 404s if `runId`
doesn't match an existing run (never auto-creates one); 409s if `scenarioId` doesn't match the
run's actual scenario. See `Backend/docs/database.md`.

## AI / Diagnostics / Stress Testing — not implemented

```http
GET  /api/runs/{runId}/ai-analysis      -> 501
GET  /api/runs/{runId}/diagnostics      -> 501
POST /api/runs/{runId}/stress-tests     -> 501
GET  /api/runs/{runId}/stress-tests     -> 501
GET  /api/stress-tests/{stressTestId}   -> 501
```

The AI and feasibility/stress-testing workstreams (`integration.md` §17-23) have no code yet.
These routes exist so the API surface matches the frontend's `AquaBlendClient` contract, but
honestly report `501 Not Implemented` with a `code` field instead of faking a result.
