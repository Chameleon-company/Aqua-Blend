# Database Setup and Migrations

## Applying migrations locally

1. Ensure PostgreSQL 17 is running and the aquablend database exists.
2. Set your connection string via user-secrets (see main README).
3. From Backend/, run: dotnet ef database update
4. Verify: psql -U postgres -d aquablend -c "\dt"

## Creating a new migration

Run: dotnet ef migrations add MigrationName --project AquaBlend.Api.csproj

Review the generated file in Migrations/ before applying — check column types and any foreign key
delete behaviour match intent (EF Core defaults foreign keys to Cascade, which is not always correct).

## Schema notes

- OptimisationResult.ResultJson stores the full MILP model output contract as PostgreSQL jsonb.
- OptimisationResult.TotalCost / Currency are nullable — non-OPTIMAL solves omit the objective
  block entirely in the source contract, so there is nothing to extract. Do not default to 0.
- OptimisationResult has foreign keys to both Scenario (ON DELETE RESTRICT) and Run (ON DELETE
  RESTRICT, unique) — a Scenario with existing results/runs cannot be deleted without explicitly
  handling those first. The Run FK was added alongside the Run entity so a result is always tied
  to the specific execution that produced it, not just the scenario (integration.md §13).
- Scenario.ExternalId is the scenario_id used everywhere in the public API; the internal integer
  Id never leaves the backend. Same pattern for Run.ExternalId (run_id), WaterSource.ExternalId
  (source_id), Plant.ExternalId (plant_id), DemandZone.ExternalId (zone_id), and the link/quality
  entities.
- Scenario.FormStateJson stores the full ScenarioFormState (scenarioName, description, sources,
  plants, demandZones, qualityProfileId, networkOverrides) as one jsonb document rather than
  normalised tables — it represents "conditions being tested" (integration.md §10-11), a
  versioned snapshot, not canonical reference facts. Reference data (sources, plants, demand
  zones, links, quality profiles) *is* normalised across real tables since it's queried/filtered
  and shared across scenarios.
- POST /api/optimisation-results now requires `runId` in the body (Run.ExternalId), not just
  `scenarioId` — it 404s if no matching Run exists (never auto-creates one) and 409s if the run's
  actual scenario doesn't match the supplied scenarioId. See `Backend/docs/api-contract.md`.
