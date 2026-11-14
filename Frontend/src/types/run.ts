/**
 * Run contracts. A run executes one already-saved scenario; a scenario may
 * have many runs (scenario_id vs run_id stay distinct throughout the app).
 * The backend owns orchestration (MILP -> diagnostics/AI); the frontend only
 * creates the run and polls its state.
 *
 * Pipeline shape:
 *   normal:      queued -> solving -> solved     -> analysing -> completed
 *   infeasible:  queued -> solving -> infeasible -> diagnosing -> analysing -> completed
 *   failure:     queued -> solving -> failed  (terminal, no diagnostics/AI stage)
 *
 * `infeasible` is a mid-pipeline stage, not a final outcome — the run still
 * proceeds through diagnostics and AI explanation to `completed`. The
 * solver's actual outcome for a completed run is carried separately on
 * `solverOutcome` so results/diagnostics pages don't need to replay history.
 */
import type { ScenarioDetail } from "./scenario";

export type RunState =
  | "queued"
  | "solving"
  | "solved"
  | "infeasible"
  | "diagnosing"
  | "analysing"
  | "completed"
  | "failed";

/** States that stop polling. `infeasible` is intentionally excluded — it continues to diagnostics. */
export const TERMINAL_RUN_STATES: readonly RunState[] = ["completed", "failed"];

export function isTerminalRunState(state: RunState): boolean {
  return (TERMINAL_RUN_STATES as RunState[]).includes(state);
}

export type SolverOutcome = "optimal" | "infeasible";

export interface RunSummary {
  runId: string;
  scenarioId: string;
  status: RunState;
  solverOutcome?: SolverOutcome;
  createdAt: string;
  /** Mirrors Backend/DTOs/Runs/RunSummaryDto.cs's cache/integration additions. */
  forceRerun: boolean;
  milpCacheHit: boolean;
  aiCacheHit: boolean;
}

export interface Run {
  runId: string;
  scenarioId: string;
  scenarioName?: string;
  status: RunState;
  solverOutcome?: SolverOutcome;
  progressMessage?: string;
  createdAt: string;
  solveTimeMs?: number | null;
  objectiveValue?: number | null;
  error?: string;
}

export interface CreateRunResponse {
  runId: string;
  status: "accepted" | "rejected";
  message?: string;
}

/**
 * ---------------------------------------------------------------------------
 * Real backend contract (AquaBlend_Frontend_Final_Integration_Implementation.md)
 * ---------------------------------------------------------------------------
 * The types above (`Run`, `RunState`, `RunSummary`) predate the real backend and
 * describe a speculative pipeline (queued -> solving -> solved/infeasible ->
 * diagnosing -> analysing -> completed) used only by the mock adapter today.
 * The real backend's actual workflow vocabulary (Backend/Domain/
 * RunWorkflowStatuses.cs) is different and is captured below as
 * `RunWorkflowStatus`. `RunDto`/`RunAggregateDto` mirror the backend's actual
 * JSON field names and casing exactly (verified against a live response), not
 * the field names guessed in the implementation brief — e.g. the backend
 * calls it `status`, not `workflowStatus`, and reports one combined `error`
 * string, not separate `errorCode`/`errorMessage`.
 */

export type RunWorkflowStatus =
  | "queued"
  | "preparing_input"
  | "milp_running"
  | "milp_completed"
  | "ai_queued"
  | "ai_running"
  | "completed"
  | "completed_with_ai_error"
  | "failed";

export const RUN_WORKFLOW_STATUSES: readonly RunWorkflowStatus[] = [
  "queued",
  "preparing_input",
  "milp_running",
  "milp_completed",
  "ai_queued",
  "ai_running",
  "completed",
  "completed_with_ai_error",
  "failed",
];

/** `milp_completed` is intentionally NOT terminal — AI analysis may still be pending. */
export const TERMINAL_RUN_WORKFLOW_STATUSES: readonly RunWorkflowStatus[] = [
  "completed",
  "completed_with_ai_error",
  "failed",
];

export function isTerminalWorkflowStatus(status?: string | null): boolean {
  if (!status) return false;
  return (TERMINAL_RUN_WORKFLOW_STATUSES as string[]).includes(status.trim().toLowerCase());
}

/** Mirrors Backend/DTOs/Runs/RunDto.cs exactly. */
export interface RunDto {
  runId: string;
  scenarioId: string;
  scenarioName: string | null;
  /** One of RunWorkflowStatus at runtime; kept as `string` so an unrecognised
   *  future value never fails to type-check — see getRunStatusMeta's fallback. */
  status: string;
  solverOutcome: string | null;
  progressMessage: string | null;
  createdAt: string;
  solveTimeMs: number | null;
  objectiveValue: number | null;
  /** Backend reports one combined message, not separate errorCode/errorMessage. */
  error: string | null;

  forceRerun: boolean;
  milpCacheHit: boolean;
  aiCacheHit: boolean;

  milpInputId: string | null;
  milpOutputId: string | null;
  aiOutputId: string | null;

  reusedMilpFromRunId: string | null;
  reusedAiFromRunId: string | null;

  milpStartedAt: string | null;
  milpCompletedAt: string | null;
  aiStartedAt: string | null;
  aiCompletedAt: string | null;
}

/** POST /api/scenarios/{scenarioId}/runs request body — mirrors Backend/DTOs/Runs/CreateRunRequestDto.cs. */
export interface CreateRunRequestDto {
  forceRerun: boolean;
}

/**
 * Mirrors Backend/Entities/MilpModelInput.cs's DTO projection. The JSON-blob
 * fields (sources/plants/.../canonicalInputJson/frontendInputJson) are
 * genuinely dynamic backend JSON — some snake_case (the canonical MILP
 * document), some camelCase (frontendInputJson, which is ScenarioFormState-
 * shaped) — so they are typed `unknown` here and read defensively at the
 * point of use rather than pretending a single static shape covers both.
 */
export interface MilpModelInputDto {
  id: string;
  inputStatus: string;
  inputContractVersion: string;
  milpModelVersion: string | null;
  scenarioName: string;
  scenarioStatus: string;
  dataSourceType: string | null;
  dataSourceView: string | null;
  allowEstimatedValues: boolean;
  failIfSourceMissingFromDatabase: boolean;
  failIfDailyAvailabilityMissing: boolean;
  failIfRequiredQualityValueMissing: boolean;
  failIfDemandMissing: boolean;
  sources: unknown;
  plants: unknown;
  demandZones: unknown;
  sourceToPlantLinks: unknown;
  plantToZoneLinks: unknown;
  qualityLimits: unknown;
  validationPolicy: unknown;
  /** ScenarioFormState-shaped (camelCase) frozen snapshot at run-creation time. */
  frontendInputJson: unknown;
  /** snake_case canonical MILP document frozen at run-creation time. */
  canonicalInputJson: unknown;
  sourceDataSnapshotJson: unknown;
  /** Python-worker-owned — null until data_loader.py / preprocessing.py run. */
  scenarioDataJson: unknown | null;
  modelParametersJson: unknown | null;
  solverConfigJson: unknown;
  canonicalInputHash: string | null;
  scenarioDataHash: string | null;
  modelParametersHash: string | null;
  inputHash: string | null;
  solverConfigHash: string | null;
  executionKey: string | null;
  scenarioDataSchemaVersion: string;
  modelParametersSchemaVersion: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** Mirrors Backend/DTOs/Milp/MilpModelOutputDto.cs exactly. */
export interface MilpModelOutputDto {
  id: string;
  /** True only for a synthesized legacy public.OptimisationResults fallback — never true for a real milp_model_output row. */
  isLegacyFallback: boolean;

  schemaVersion: string | null;
  scenarioExternalId: string | null;
  scenarioStatus: string | null;

  executionKey: string | null;
  inputHash: string | null;
  modelParametersHash: string | null;

  milpModelVersion: string | null;
  solverName: string | null;
  solverVersion: string | null;
  solverConfigHash: string | null;

  solverTerminationCondition: string | null;
  solverMessage: string | null;
  solveTimeMs: number | null;

  rawOutputJson: unknown;
  outputHash: string | null;

  cacheReusable: boolean;
  forcedRecompute: boolean;

  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  createdAt: string;

  loaderStatus: string | null;
  loaderScenarioReady: boolean | null;
  loaderValidationIssues: unknown;
  loaderChecks: unknown;

  preprocessingStatus: string | null;
  preprocessingWarnings: unknown;
  preprocessingChecks: unknown;

  outputConsistencyStatus: string | null;
  outputConsistencyTolerance: number | null;
  outputConsistencyChecks: unknown;

  solverStatus: string | null;
  solverIsFeasible: boolean | null;
  solverIsOptimal: boolean | null;
  solverObjectiveValue: number | null;

  totalDemandMlPerDay: number | null;
  totalWithdrawalMlPerDay: number | null;
  totalTreatedMlPerDay: number | null;
  totalDeliveredMlPerDay: number | null;

  selectedSourceCount: number | null;
  activePlantCount: number | null;

  totalSourceFixedCost: number | null;
  totalSourceVariableCost: number | null;
  totalPlantFixedCost: number | null;
  totalPlantVariableCost: number | null;
  reconstructedTotalCost: number | null;
  totalCost: number | null;
  costReconciles: boolean | null;

  sources: unknown;
  plants: unknown;
  demandZones: unknown;
  flowsSourceToPlant: unknown;
  flowsPlantToZone: unknown;
  quality: unknown;
  bindingConstraintsSummary: unknown;
  warnings: unknown;
}

/** Mirrors Backend/DTOs/Ai/MilpAiOutputDto.cs exactly. */
export interface MilpAiOutputDto {
  id: string;
  status: string;

  aiProvider: string | null;
  aiModel: string | null;
  aiModelVersion: string | null;
  promptVersion: string | null;
  analysisVersion: string | null;
  aiContractVersion: string;

  milpOutputHash: string | null;
  aiCacheKey: string | null;

  aiInputJson: unknown;

  executiveSummary: string | null;
  decisionExplanation: string | null;

  keyFindings: unknown;
  anomalies: unknown;
  recommendations: unknown;
  warnings: unknown;
  riskAssessment: unknown;
  sourceAnalysis: unknown;
  plantAnalysis: unknown;
  qualityAnalysis: unknown;
  limitations: unknown;

  rawAiJson: unknown;
  aiOutputHash: string | null;

  cacheReusable: boolean;
  forcedRecompute: boolean;

  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;

  errorCode: string | null;
  errorMessage: string | null;

  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

/**
 * GET /api/runs/{runId} response shape (AquaBlend_Backend_Final_Integration_
 * Implementation.md §15). `scenario` reuses the existing ScenarioDetail type
 * since the backend's ScenarioDetailDto already matches it field-for-field.
 */
export interface RunAggregateDto {
  run: RunDto;
  scenario: ScenarioDetail | null;
  input: MilpModelInputDto | null;
  milpOutput: MilpModelOutputDto | null;
  aiOutput: MilpAiOutputDto | null;
}
