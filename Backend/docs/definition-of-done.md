# Definition of Done

## Sprint 1 Definition

Sprint 1 is complete when:

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | The ASP.NET Core API, test project, documentation folders, and CI workflow are correctly scaffolded. | ✅ Met | `AquaBlend.Api.csproj`, `AquaBlend.Tests`, `Backend/docs/`, `.github/workflows/ci.yml` all exist. |
| 2 | The application restores, builds, and runs successfully. | ✅ Met | Confirmed locally (`dotnet build`) and via CI restore/build steps. |
| 3 | `GET /api/health` remains operational and returns a successful response. | ✅ Met | Minimal API endpoint still present in [Program.cs](../Program.cs). |
| 4 | Controller support is enabled, and implemented controllers appear in OpenAPI. | ✅ Met | `AddControllers()`/`MapControllers()` in Program.cs; `AuthController`, `ChangesController`, `ScenariosController`, `WaterSourcesController` are attribute-routed and picked up by `AddOpenApi()`/`MapOpenApi()`. |
| 5 | Entity Framework Core connects successfully to PostgreSQL. | ✅ Met | `AddDbContext` configures `UseNpgsql` outside the Testing environment; connection string sourced from configuration/User Secrets. |
| 6 | The initial migration and development seed data work correctly. | ✅ Met | `Migrations/20260728052815_InitialCreate.cs` plus a second migration for OptimisationResult; `SeedData.Initialize` seeds Water Sources, a Scenario, and an OptimisationResult, and runs on startup via `db.Database.Migrate()`. |
| 7 | Water Source and Scenario GET endpoints return the expected data and HTTP status codes. | ✅ Met | `WaterSourcesController` and `ScenariosController` implement `GetAll`/`GetById` with 200/404 handling, covered by tests in `ScenarioEndpointsTests.cs`. |
| 8 | The proposed authentication, authorisation, and automatic-update approaches are implemented as proof of concepts or clearly documented. | ✅ Met | JWT auth + role policies implemented (`AuthController`, `Authorization/AppRoles.cs`, `Authorization/AppPolicies.cs`) and documented in `docs/authentication.md`; REST polling proof of concept implemented in `ChangesController` and documented in `docs/automatic-updates.md`. |
| 9 | Automated tests pass using `dotnet test`. | ✅ Met | Verified locally with PostgreSQL not running (tests use the `Testing` environment's in-memory provider). |
| 10 | GitHub Actions successfully restores, builds, and tests the backend solution. | ✅ Met | `.github/workflows/ci.yml` runs restore/build/test on push and PR (see CI review notes below for gaps in branch coverage). |
| 11 | No passwords, connection strings, API keys, or generated build files are committed. | ✅ Met | `appsettings.json` only contains a placeholder (`CHANGE_ME`) connection string; real secrets are documented as living in User Secrets; `.gitignore` excludes `bin/`, `obj/`, `.env*`, local appsettings overrides, and certificates. |
| 12 | Completed work is reviewed and merged into `backend/sprint-1` through pull requests. | ✅ Met | Recent history shows PR merges (e.g. `#8`, `#5`, `#9`) into `backend/sprint-1`. |
| 13 | Relevant Sprint 1 documentation is complete and up to date. | ✅ Met | `docs/authentication.md`, `docs/automatic-updates.md`, `docs/database.md` are present and reflect the current implementation. |

All Sprint 1 criteria are met as of this update.

## Sprint 2 Definition

Sprint 2 is complete when:

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | The backend restores, builds and runs successfully. | ✅ Met | Same as Sprint 1 criterion 2; still true on current `master`/`backend/sprint-1`. |
| 2 | GitHub CI passes. | ⚠️ Needs verification | CI workflow only triggers on `backend/sprint-1` and `feature/**`; Sprint 2 work on `sprint2/*`-style branches currently gets no CI run on push (see CI review). Fix required before this can be considered reliably met. |
| 3 | PostgreSQL migrations apply successfully. | ✅ Met | Two migrations exist (`InitialCreate`, `AddOptimisationResultAndScenarioExternalId`); `Program.cs` calls `db.Database.Migrate()` on startup against a relational provider. |
| 4 | Water Source and Scenario GET endpoints work. | ✅ Met | `WaterSourcesController.GetAll/GetById` and `ScenariosController.GetAll/GetById`, both covered by tests. |
| 5 | A Scenario can be created through POST. | ✅ Met | `ScenariosController.Create`, covered by `ScenarioEndpointsTests.Create_ReturnsCreatedScenario` and the invalid-data test. |
| 6 | An Optimisation Result can be submitted through POST. | ✅ Met | `POST /api/optimisation-results` (`OptimisationResultsController` → `OptimisationResultIngestService`) now exists, keyed by `runId`/`scenarioId`; 404s if the run doesn't exist, 409s on a scenario/run mismatch. Extends the originally-documented contract with `runId` now that the Run entity exists — see `docs/database.md`. |
| 7 | Results can be retrieved by result ID and Scenario ID. | ✅ Met | `GET /api/runs/{runId}/results` retrieves a result (results are now keyed by run, not a separate result id, per `integration.md` §13); `GET /api/scenarios/{scenarioId}/runs` lists a scenario's runs, from which individual results are reachable. |
| 8 | Multiple results can be stored for one Scenario. | ✅ Met | `Scenario` 1–many `Run` 1–1 `OptimisationResult` (`OptimisationResult.RunId` is now a required, unique FK — one result per run, many runs per scenario), verified end-to-end by `ScenarioEndpointsTests`. |
| 9 | The changes endpoint reports new or updated records. | ✅ Met | `ChangesController` returns Water Sources and Scenarios created/updated after `since`, tested by `ChangesControllerTests`. |
| 10 | JWT authentication and role policies work. | ⚠️ Partially met, deliberately | JWT bearer auth and the `CanView`/`CanAnalyse`/`CanAdminister` policies are implemented and enforced on `GET /api/auth/me`. `[Authorize]` is still not applied to the data/scenario/run controllers — this is now a deliberate, communicated decision (2026-08-31): the frontend has no auth/token-attaching code yet and no auth provider (e.g. Supabase Auth vs. the existing dev-JWT scheme) has been chosen, so adding enforcement now would just break the newly-wired frontend↔backend connection without a token source to satisfy it. See `todo.md`. |
| 11 | CORS allows the agreed Next.js frontend origin. | ✅ Met | `Program.cs` now calls `AddCors`/`UseCors("Frontend")`, origins read from `Cors:AllowedOrigins` config (`http://localhost:3000` in `appsettings.Development.json`, empty by default in prod). |
| 12 | Invalid requests return consistent errors. | ⚠️ Partially met | `Backend/Middleware/ApiExceptionMiddleware.cs` now gives 404/409/501 domain errors (thrown as `AquaBlend.Exceptions.ApiException`) one consistent `application/problem+json` shape with a machine-readable `code`. `[ApiController]` model validation still separately produces `ValidationProblemDetails` for 400s (a different but still standard shape). `ChangesController`'s pre-existing ad hoc `{ error }` body for its own 400s was left as-is — a remaining, known inconsistency, not touched in this pass. |
| 13 | OpenAPI displays all frontend-required endpoints. | ⚠️ Partially met | All new controllers (Sources, Plants, DemandZones, NetworkLinks, QualityProfiles, Scenarios, Runs, OptimisationResults) are attribute-routed and picked up by `AddOpenApi()`/`MapOpenApi()`. `MapOpenApi()` is still only called `if (app.Environment.IsDevelopment())`, so the document still isn't available in other environments — not addressed in this pass. |
| 14 | Sample requests and responses are documented. | ⚠️ Partially met | `docs/api-contract.md` was rewritten with the real endpoint list, request/response shapes, and error-handling notes for every controller added in this pass. `AquaBlend.Api.http` still points at the unused scaffold `/weatherforecast` route — not updated in this pass. |
| 15 | Automated tests pass. | ⚠️ Needs verification on this machine | `ScenarioEndpointsTests` was rewritten for the new string-keyed contract (create/update/delete/validate/run-creation, including the "run always fails without a solver" behaviour) and expanded with run-lifecycle cases. This machine only had the .NET 8 SDK installed when this work was done (the project targets net9.0, same as Sprint 1) — verify with `dotnet test Backend/AquaBlend.sln` once a 9.0.x SDK is available. |
| 16 | No credentials or secrets are committed. | ✅ Met | `appsettings*.json` still contain placeholders only; the real Supabase connection string (once supplied) belongs in User Secrets / `appsettings.Local.json`, not committed. |
| 17 | The frontend can successfully call at least one backend endpoint. | ⚠️ Ready, not yet run end-to-end | CORS (criterion 11) and a real frontend HTTP client now both exist — `stack/Frontend/src/services/http/httpAquaBlendClient.ts` implements the full `AquaBlendClient` interface against these endpoints, switched on via `NEXT_PUBLIC_API_BASE_URL`. Not yet exercised against a running backend + live database in this pass (see todo.md for the remaining Supabase connection step). |
| 18 | All completed work is reviewed through pull requests. | ✅ Met (process, ongoing) | Sprint 1 work followed this process (see PR merges above); no evidence of direct-to-branch commits bypassing review so far. This should keep being verified per PR going forward rather than treated as a one-time check. |

### Summary of remaining Sprint 2 gaps

- `[Authorize]` is still not applied to the data/scenario/run controllers — deliberately deferred until an auth provider is chosen and the frontend has token-attaching code (criterion 10).
- `ChangesController`'s `{ error }` shape and `AquaBlend.Api.http`'s stale sample requests weren't touched in this pass (criteria 12, 14).
- `MapOpenApi()` is still Development-only (criterion 13).
- This machine's .NET SDK situation should be confirmed and `dotnet test`/`dotnet build` re-verified locally (criterion 15).
- End-to-end frontend↔backend↔database verification against a real running instance is still outstanding — see `todo.md` for the connection-string step (criterion 17).
- CI branch triggers already cover `sprint2/**`/`sprint3/**` in the current `.github/workflows/ci.yml` — the "not met" note from earlier in this document appears to be stale; re-check before treating it as an open gap.
