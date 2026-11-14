/**
 * Real HTTP implementation of AquaBlendClient, talking to the AquaBlend backend
 * (Backend/Controllers) over fetch. This is the file aquaBlendClient.ts's own comment pointed
 * at: "Replace this function body with a real HTTP client once upstream contracts are
 * available — no other file in the app needs to change." Every method here has a matching
 * route on the backend; see stack/todo.md for what's still stubbed (AI analysis, diagnostics,
 * stress testing — the backend returns 501 for those on purpose, see
 * Backend/Controllers/RunsController.cs).
 */
import type { AquaBlendClient } from "../aquaBlendClient";
import type {
  SourceRef,
  PlantRef,
  DemandZoneRef,
  QualityProfile,
  NetworkLinkRef,
  SourceFilters,
} from "@/types/reference-data";
import type { ScenarioDetail, ScenarioFormState, ScenarioSummary, ValidationResult } from "@/types/scenario";
import type { CreateRunRequestDto, CreateRunResponse, Run, RunAggregateDto, RunSummary } from "@/types/run";
import type { MilpResultViewModel, RawMilpResult } from "@/types/milp-results";
import { mapMilpResultToViewModel } from "@/types/milp-results";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";
import type { StressTestConfig, StressTestResult, StressTestSummary } from "@/types/stress-test";
import type { FrontendErrorCategory } from "@/types/errors";
import type { RunDto } from "@/types/run";
import { ServiceError } from "../errorMapping";

/**
 * Legacy-shape adapter for the pre-aggregate `Run` type: the real backend's
 * status vocabulary is wider than the old `RunState` union, so this is a
 * type-level cast, not a value transform — RunStatus/getRunStatusMeta render
 * any resulting string safely regardless (utils/resultStatus.ts).
 */
function runDtoToLegacyRun(dto: RunDto): Run {
  return {
    runId: dto.runId,
    scenarioId: dto.scenarioId,
    scenarioName: dto.scenarioName ?? undefined,
    status: dto.status as Run["status"],
    solverOutcome: (dto.solverOutcome ?? undefined) as Run["solverOutcome"],
    progressMessage: dto.progressMessage ?? undefined,
    createdAt: dto.createdAt,
    solveTimeMs: dto.solveTimeMs,
    objectiveValue: dto.objectiveValue,
    error: dto.error ?? undefined,
  };
}

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

interface ProblemBody {
  code?: string;
  detail?: string;
  title?: string;
}

// Maps the `code` field the backend's ApiExceptionMiddleware attaches
// (Backend/Middleware/ApiExceptionMiddleware.cs) onto the frontend's own error categories.
const CODE_TO_CATEGORY: Partial<Record<string, FrontendErrorCategory>> = {
  NOT_FOUND: "NOT_FOUND",
  RUN_CREATION_FAILED: "RUN_CREATION_FAILED",
  OPTIMISATION_FAILED: "OPTIMISATION_FAILED",
  AI_ANALYSIS_NOT_IMPLEMENTED: "AI_ANALYSIS_FAILED",
  DIAGNOSTICS_NOT_IMPLEMENTED: "DIAGNOSTICS_FAILED",
  STRESS_TESTING_NOT_IMPLEMENTED: "STRESS_TEST_FAILED",
};

function mapStatusToCategory(status: number, code?: string): FrontendErrorCategory {
  if (code && CODE_TO_CATEGORY[code]) return CODE_TO_CATEGORY[code]!;
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHORISED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    default:
      return "UNKNOWN_ERROR";
  }
}

async function throwFromErrorResponse(response: Response): Promise<never> {
  let body: ProblemBody | null = null;
  try {
    body = (await response.json()) as ProblemBody;
  } catch {
    // No JSON body (e.g. a raw 500 from something other than ApiExceptionMiddleware).
  }

  const category = mapStatusToCategory(response.status, body?.code);
  const message = body?.detail ?? body?.title ?? `Request failed with status ${response.status}.`;
  throw new ServiceError(category, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Network failures (backend unreachable, DNS, CORS rejection) throw a raw TypeError here,
  // which aquaBlendClient's toAppError() already recognises as NETWORK_ERROR — left to propagate.
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    await throwFromErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function queryString(params: Record<string, string | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export const httpAquaBlendClient: AquaBlendClient = {
  getSources(filters?: SourceFilters): Promise<SourceRef[]> {
    const qs = queryString({
      sourceType: filters?.sourceType,
      availability: filters?.availability,
      modelReady: filters?.modelReady,
      estimatedOrMeasured: filters?.estimatedOrMeasured,
    });
    return request<SourceRef[]>(`/api/sources${qs}`);
  },

  getPlants(): Promise<PlantRef[]> {
    return request<PlantRef[]>("/api/plants");
  },

  getDemandZones(): Promise<DemandZoneRef[]> {
    return request<DemandZoneRef[]>("/api/demand-zones");
  },

  getNetworkLinks(): Promise<NetworkLinkRef[]> {
    return request<NetworkLinkRef[]>("/api/network-links");
  },

  getQualityProfiles(): Promise<QualityProfile[]> {
    return request<QualityProfile[]>("/api/quality-profiles");
  },

  getScenarios(): Promise<ScenarioSummary[]> {
    return request<ScenarioSummary[]>("/api/scenarios");
  },

  getScenario(scenarioId: string): Promise<ScenarioDetail> {
    return request<ScenarioDetail>(`/api/scenarios/${encodeURIComponent(scenarioId)}`);
  },

  createScenario(form: ScenarioFormState): Promise<ScenarioDetail> {
    return request<ScenarioDetail>("/api/scenarios", {
      method: "POST",
      body: JSON.stringify(form),
    });
  },

  updateScenario(scenarioId: string, form: ScenarioFormState): Promise<ScenarioDetail> {
    return request<ScenarioDetail>(`/api/scenarios/${encodeURIComponent(scenarioId)}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    await request<void>(`/api/scenarios/${encodeURIComponent(scenarioId)}`, { method: "DELETE" });
  },

  validateScenario(scenarioId: string): Promise<ValidationResult> {
    return request<ValidationResult>(`/api/scenarios/${encodeURIComponent(scenarioId)}/validate`, {
      method: "POST",
    });
  },

  createRun(scenarioId: string, requestBody?: CreateRunRequestDto): Promise<CreateRunResponse> {
    return request<CreateRunResponse>(`/api/scenarios/${encodeURIComponent(scenarioId)}/runs`, {
      method: "POST",
      body: JSON.stringify(requestBody ?? { forceRerun: false }),
    });
  },

  getScenarioRuns(scenarioId: string): Promise<RunSummary[]> {
    return request<RunSummary[]>(`/api/scenarios/${encodeURIComponent(scenarioId)}/runs`);
  },

  // GET /api/runs/{id} now returns the aggregate shape (run/scenario/input/
  // milpOutput/aiOutput), not a flat RunDto — this adapts it back into the
  // old `Run` shape so useRunPolling and its dependents (/results/*,
  // /stress-testing, DiagnosticPanel) keep working against the real backend
  // instead of silently receiving `undefined` for every field.
  async getRun(runId: string): Promise<Run> {
    const aggregate = await request<RunAggregateDto>(`/api/runs/${encodeURIComponent(runId)}`);
    return runDtoToLegacyRun(aggregate.run);
  },

  getRunAggregate(runId: string): Promise<RunAggregateDto> {
    return request<RunAggregateDto>(`/api/runs/${encodeURIComponent(runId)}`);
  },

  async getResults(runId: string): Promise<MilpResultViewModel> {
    const raw = await request<RawMilpResult>(`/api/runs/${encodeURIComponent(runId)}/results`);
    return mapMilpResultToViewModel(raw);
  },

  getAIAnalysis(runId: string): Promise<AIAnalysisResult> {
    return request<AIAnalysisResult>(`/api/runs/${encodeURIComponent(runId)}/ai-analysis`);
  },

  getDiagnostics(runId: string): Promise<DiagnosticsResult> {
    return request<DiagnosticsResult>(`/api/runs/${encodeURIComponent(runId)}/diagnostics`);
  },

  createStressTest(runId: string, config: StressTestConfig): Promise<StressTestSummary> {
    return request<StressTestSummary>(`/api/runs/${encodeURIComponent(runId)}/stress-tests`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  getRunStressTests(runId: string): Promise<StressTestSummary[]> {
    return request<StressTestSummary[]>(`/api/runs/${encodeURIComponent(runId)}/stress-tests`);
  },

  getStressTest(stressTestId: string): Promise<StressTestResult> {
    return request<StressTestResult>(`/api/stress-tests/${encodeURIComponent(stressTestId)}`);
  },
};
