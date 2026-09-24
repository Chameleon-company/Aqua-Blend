# Automatic Updates

## Approach

AquaBlend uses REST polling for automatic updates. This approach was selected because the application already uses a REST API and the frontend can periodically request records that have changed since its previous successful request.

The automatic updates implementation tracks changes to:

- Water Sources
- Scenarios
- Optimisation Runs
- Optimisation Results

Sprint 3 extends the existing polling mechanism to include Optimisation Runs so that the frontend can detect run-status changes without repeatedly retrieving complete run or result bodies.

## Endpoint

```http
GET /api/changes?since={timestamp}
```

### Example Request

```http
GET /api/changes?since=2026-09-20T03:00:00Z
```

The `since` query parameter is required and must contain a valid ISO 8601 UTC timestamp.

The endpoint checks the `CreatedAt` and `UpdatedAt` timestamps of supported entities and returns records created or updated after the supplied timestamp.

`GET /api/changes` requires an authenticated request under the `CanView` policy. A response of `401` means the request is missing a bearer token or the token has expired.

## Response

The endpoint returns:

- The timestamp supplied by the client as `requestedSince`.
- A server-generated UTC timestamp as `serverTimestamp`.
- Water Sources created or updated after the supplied timestamp.
- Scenarios created or updated after the supplied timestamp.
- Optimisation Run metadata for runs created or updated after the supplied timestamp.
- Optimisation Result summaries for results created or updated after the supplied timestamp.

### Optimisation Run Metadata

Optimisation Runs are projected into `OptimisationRunSummaryDto`.

The polling response includes:

- `id`
- `scenarioId`
- `workflowStatus`
- `solverStatus`
- `createdAt`
- `updatedAt`

The following run data is intentionally not included in the polling response:

- `scenarioSnapshotJson`
- `Scenario` navigation data
- `Result` navigation data

This keeps the polling response lightweight while still allowing the frontend to detect run-status changes.

### Optimisation Result Metadata

Optimisation Results are returned as lightweight summaries.

The polling response includes:

- `id`
- `scenarioId`
- `status`
- `solvedAt`
- `receivedAt`
- `contractVersion`
- `totalCost`
- `currency`
- `createdAt`
- `updatedAt`

The full `resultJson` is not returned by the changes endpoint. The purpose of the endpoint is to notify the frontend that an Optimisation Result has changed rather than resend the complete optimisation result during every poll.

## Example Response

```json
{
  "requestedSince": "2026-09-20T03:00:00Z",
  "serverTimestamp": "2026-09-20T03:00:30Z",
  "waterSources": [],
  "scenarios": [],
  "optimisationRuns": [
    {
      "id": 12,
      "scenarioId": 3,
      "workflowStatus": "solving",
      "solverStatus": null,
      "createdAt": "2026-09-20T02:55:00Z",
      "updatedAt": "2026-09-20T03:00:15Z"
    }
  ],
  "optimisationResults": [
    {
      "id": 7,
      "scenarioId": 3,
      "status": "OPTIMAL",
      "solvedAt": "2026-09-20T03:00:20Z",
      "receivedAt": "2026-09-20T03:00:22Z",
      "contractVersion": "1.0",
      "totalCost": 12500.00,
      "currency": "AUD",
      "createdAt": "2026-09-20T03:00:22Z",
      "updatedAt": null
    }
  ]
}
```

If no records have changed since the supplied timestamp, the endpoint returns empty collections rather than `null`.

For example:

```json
{
  "requestedSince": "2026-09-20T03:00:00Z",
  "serverTimestamp": "2026-09-20T03:00:30Z",
  "waterSources": [],
  "scenarios": [],
  "optimisationRuns": [],
  "optimisationResults": []
}
```

## Timestamp Handling

All timestamps used by the automatic updates endpoint are UTC.

The `since` parameter must be supplied as a UTC timestamp.

For example:

```text
2026-09-20T03:00:00Z
```

The endpoint rejects:

- A missing `since` parameter.
- An invalid timestamp.
- A timestamp that does not use UTC.

`CreatedAt` and `UpdatedAt` are automatically maintained by `AquaBlendDbContext` when entities are created or modified.

The endpoint uses these fields to determine whether a Water Source, Scenario, Optimisation Run, or Optimisation Result has changed since the previous poll.

For Optimisation Runs, a workflow-status change updates `UpdatedAt`. This allows a run that was created before the supplied `since` timestamp to still be returned when its status changes after that timestamp.

The frontend should use the `serverTimestamp` returned by the previous successful request as the `since` value for the next request. This avoids relying on the frontend device's local clock.

## Run-Status Polling

Run-status polling is handled through the existing automatic updates endpoint.

For example, a run may initially have:

```text
workflowStatus = queued
```

When the AI team picks up the run, the status may change to:

```text
workflowStatus = solving
```

Updating the run causes `UpdatedAt` to be refreshed by `AquaBlendDbContext`.

The next frontend request:

```http
GET /api/changes?since={lastServerTimestamp}
```

returns the changed run in `optimisationRuns`.

The frontend can therefore update the displayed run status without requesting complete optimisation data during every polling interval.

## Run Lifecycle

The primary Optimisation Run workflow is:

```text
draft → ready → queued → solving → solved → analysing → completed
```

The workflow is not strictly one-directional. It also supports controlled backward, retry, and failure transitions.

Allowed transitions are:

- `draft` → `ready` — backend, when validation passes.
- `ready` → `draft` — backend, when the scenario is edited again.
- `ready` → `queued` — client submits the run.
- `queued` → `ready` — client withdraws the run before pickup.
- `queued` → `solving` — AI team picks up the run.
- `solving` → `solved` — result is received.
- `solving` → `queued` — retry after a stalled solve.
- `solved` → `analysing` — backend derives diagnostics.
- `analysing` → `completed` — backend completes post-processing.
- `queued` → `failed` — AI team, or backend when a timeout is detected.
- `solving` → `failed` — AI team, or backend when a timeout is detected.
- `solved` → `failed` — backend only.
- `analysing` → `failed` — backend only.

A client must never transition a run to `failed`. If a client abandons a run before the AI team picks it up, the transition is:

```text
queued → ready
```

No other state skips are permitted. For example:

```text
ready → solving
solved → completed
```

are invalid because they bypass work owned by another stage of the workflow.

`completed` and `failed` are terminal states.

A failed run is not transitioned back into the workflow for a retry. Retrying failed work requires creation of a new run.

Same-state transitions are treated as successful no-ops. For example:

```text
solving → solving
```

is accepted without changing the state. This allows callers to safely retry a request after a network failure.

### Failure Information

A workflow failure should store:

- `FailureReason` — describes why the workflow failed.
- `FailureSource` — identifies which component declared the failure.

`FailureSource` is important because failure ownership determines how the failure should be routed and investigated.

The backend timeout sweeper has not yet been implemented. Until the timeout sweeper exists, a run can remain in `solving` indefinitely if the solver process stops without reporting a failure.

### Actor-Aware Transition Validation

A valid state change depends on both the current/target states and the actor requesting the change.

The ownership rules include:

- The client may submit `ready → queued`.
- The client may withdraw `queued → ready`.
- The client must never transition a run to `failed`.
- The AI team owns `queued → solving`.
- The AI team may declare `queued → failed` or `solving → failed`.
- The backend may declare `queued → failed` or `solving → failed` when a timeout is detected.
- After a result has been received, failure ownership belongs to the backend.
- `solved → failed` and `analysing → failed` are therefore backend-only.

Distinguishing the AI team from a normal client requires a service identity rather than only a user role. Integration of that identity with transition enforcement must be coordinated with the authentication implementation.

Invalid transitions should return:

```http
409 Conflict
```

The request itself is well-formed, but the requested transition conflicts with the run's current workflow state.

When a transition is rejected, the stored `WorkflowStatus` must remain unchanged.

### Workflow Status and Solver Status

`WorkflowStatus` and `SolverStatus` are separate vocabularies with different responsibilities.

`WorkflowStatus` belongs to AquaBlend and describes the application's processing lifecycle.

Its allowed values are:

- `draft`
- `ready`
- `queued`
- `solving`
- `solved`
- `analysing`
- `completed`
- `failed`

`SolverStatus` mirrors the MILP solver contract and uses:

- `OPTIMAL`
- `INFEASIBLE`
- `UNBOUNDED`
- `TIME_LIMIT`
- `ERROR`

`WorkflowStatus = failed` must not be confused with:

```text
SolverStatus = INFEASIBLE
```

`failed` means that the workflow or processing pipeline broke, for example because of a crash, timeout, or malformed payload.

`INFEASIBLE` means that the solver ran successfully and determined that no feasible blend exists. This is a valid solver outcome rather than a system failure, so the workflow can still continue through its normal post-processing stages to `completed`.

## Frontend Polling

The frontend can retrieve automatic updates using the following workflow:

1. Store the `serverTimestamp` returned by the previous successful request.
2. Wait for the configured polling interval.
3. Send another authenticated request using the stored timestamp:

```http
GET /api/changes?since={lastServerTimestamp}
```

4. Process any returned Water Sources.
5. Process any returned Scenarios.
6. Process returned Optimisation Run metadata and update displayed run statuses.
7. Process returned Optimisation Result summaries.
8. If the frontend requires complete result information, retrieve it using the appropriate Optimisation Result endpoint.
9. Store the new `serverTimestamp`.
10. Repeat the process.

## Example JavaScript

```javascript
let lastSuccessfulTimestamp = "2026-09-20T03:00:00Z";

async function pollForChanges() {
    const response = await fetch(
        `/api/changes?since=${encodeURIComponent(lastSuccessfulTimestamp)}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!response.ok) {
        console.error("Polling failed");
        return;
    }

    const changes = await response.json();

    updateWaterSources(changes.waterSources);
    updateScenarios(changes.scenarios);
    updateOptimisationRuns(changes.optimisationRuns);
    updateOptimisationResults(changes.optimisationResults);

    lastSuccessfulTimestamp = changes.serverTimestamp;
}

setInterval(pollForChanges, 30000);
```

The polling interval shown above is 30 seconds and can be adjusted later according to frontend requirements.

The bearer token must be included because `/api/changes` is protected by the `CanView` policy.

## Sprint 3 Verification

The automatic updates and run-status implementation is covered by automated tests.

The tests verify, among other existing backend behaviour, that:

- Invalid timestamps return a bad request response.
- Changed Water Sources can be returned.
- Changed Scenarios can be returned.
- Changed Optimisation Runs can be returned.
- Changed Optimisation Results can be returned.
- A run created before the `since` threshold is returned when its `UpdatedAt` value changes after the threshold.
- Run workflow-status metadata is returned through the lightweight DTO.
- Valid workflow-status transitions are recognised.
- Invalid workflow-status transitions are rejected.
- Actor ownership is considered when validating transitions.
- Same-state transitions are accepted as successful no-ops.
- Terminal workflow states cannot transition to another state.
- Empty collections are returned when no matching changes exist.

At the current Sprint 3 development point, the complete backend test suite passes with:

```text
Total tests: 73
Passed: 73
Failed: 0
Skipped: 0
```

The test count above should be updated whenever additional workflow-transition or endpoint tests are added.

## Notes

- REST polling continues to be used instead of SignalR.
- All automatic-update timestamps use UTC.
- `serverTimestamp` should be used as the `since` value for the next successful polling request.
- Optimisation Runs were added to automatic updates during Sprint 3.
- Optimisation Runs are projected into `OptimisationRunSummaryDto`.
- `scenarioSnapshotJson` is intentionally excluded from polling responses.
- Optimisation Results are projected into `OptimisationResultSummaryDto`.
- `resultJson` is intentionally excluded from polling responses.
- Run and Result navigation objects are not returned as part of automatic-update metadata.
- Run status changes can be detected through `UpdatedAt`.
- `WorkflowStatus` and `SolverStatus` represent different concepts and must not be conflated.
- `completed` and `failed` are terminal workflow states.
- Retrying a failed workflow requires creation of a new run.
- Same-state workflow transitions are idempotent no-op successes.
- `FailureReason` and `FailureSource` are required for workflow failure tracking.
- The timeout sweeper has not yet been implemented.
- AI-team identity enforcement depends on the service-identity authentication mechanism.
- The `/api/changes` endpoint remains protected by the `CanView` authorisation policy.