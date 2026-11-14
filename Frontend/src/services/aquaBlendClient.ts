/**
 * Central frontend service abstraction.
 *
 * Components must depend only on this interface (via the grouped *Api
 * modules below), never on fetch/localStorage calls scattered through the
 * UI. The frontend never talks to Supabase, MILP, AI, or diagnostics
 * directly — every method here represents a call to the AquaBlend backend,
 * which owns orchestration to those systems. Swapping the mock adapter for a
 * real HTTP client later means writing one new file that implements this
 * interface and changing the single import in `getClient()` below.
 */
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
import type { MilpResultViewModel } from "@/types/milp-results";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";
import type { StressTestConfig, StressTestResult, StressTestSummary } from "@/types/stress-test";
import { mockAquaBlendClient } from "./mock/mockClient";
import { httpAquaBlendClient } from "./http/httpAquaBlendClient";

export interface AquaBlendClient {
  // Reference data — Supabase/backend-owned facts, read-only from the frontend.
  getSources(filters?: SourceFilters): Promise<SourceRef[]>;
  getPlants(): Promise<PlantRef[]>;
  getDemandZones(): Promise<DemandZoneRef[]>;
  getNetworkLinks(): Promise<NetworkLinkRef[]>;
  getQualityProfiles(): Promise<QualityProfile[]>;

  // Scenarios — create/configure/validate, never executes the MILP.
  getScenarios(): Promise<ScenarioSummary[]>;
  getScenario(scenarioId: string): Promise<ScenarioDetail>;
  createScenario(form: ScenarioFormState): Promise<ScenarioDetail>;
  updateScenario(scenarioId: string, form: ScenarioFormState): Promise<ScenarioDetail>;
  deleteScenario(scenarioId: string): Promise<void>;
  validateScenario(scenarioId: string): Promise<ValidationResult>;

  // Runs — executes an already-saved scenario. One scenario can have many runs.
  // `request` defaults to { forceRerun: false } when omitted.
  createRun(scenarioId: string, request?: CreateRunRequestDto): Promise<CreateRunResponse>;
  getScenarioRuns(scenarioId: string): Promise<RunSummary[]>;
  /** @deprecated superseded by getRunAggregate — kept for the legacy /results/* pages only. */
  getRun(runId: string): Promise<Run>;
  getResults(runId: string): Promise<MilpResultViewModel>;
  // The real backend's run-detail endpoint — returns run + scenario + input +
  // milpOutput + aiOutput in one call (AquaBlend_Backend_Final_Integration_
  // Implementation.md §15). This is what the run page now consumes.
  getRunAggregate(runId: string): Promise<RunAggregateDto>;

  // Analysis — AI interpretation and infeasibility diagnostics of a run.
  getAIAnalysis(runId: string): Promise<AIAnalysisResult>;
  getDiagnostics(runId: string): Promise<DiagnosticsResult>;

  // Stress testing — frontend only configures; the backend executes.
  createStressTest(runId: string, config: StressTestConfig): Promise<StressTestSummary>;
  getRunStressTests(runId: string): Promise<StressTestSummary[]>;
  getStressTest(stressTestId: string): Promise<StressTestResult>;
}

/**
 * A real backend now exists (Backend/Controllers) and httpAquaBlendClient talks to it.
 * Which adapter is active is controlled by NEXT_PUBLIC_API_BASE_URL: unset (the default for
 * anyone who hasn't set up the backend/database locally) keeps using the mock so nothing
 * breaks; set it to the backend's origin (e.g. http://localhost:5194) to go live. No other
 * file in the app needs to change either way.
 */
export function getClient(): AquaBlendClient {
  return process.env.NEXT_PUBLIC_API_BASE_URL ? httpAquaBlendClient : mockAquaBlendClient;
}
