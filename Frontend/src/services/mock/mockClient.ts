/**
 * Typed mock adapter implementing AquaBlendClient against local fixtures.
 *
 * No backend exists yet, so this simulates the full orchestration pipeline
 * (scenario CRUD + validation, then run creation -> solving -> diagnostics/AI
 * -> completed) entirely in memory. Isolated under services/mock/ so it is
 * obvious where to delete/replace it once a real HTTP client is available
 * (see aquaBlendClient.ts). The synthetic allocation logic below stands in
 * for the MILP solver in this mock only — it never leaks into presentation
 * code, which always renders through mapMilpResultToViewModel().
 */
import type { AquaBlendClient } from "../aquaBlendClient";
import type {
  DemandZoneRef,
  NetworkLinkRef,
  PlantRef,
  QualityProfile,
  SourceFilters,
  SourceRef,
} from "@/types/reference-data";
import type { ScenarioDetail, ScenarioFormState, ScenarioSummary, ValidationIssue, ValidationResult } from "@/types/scenario";
import type {
  CreateRunRequestDto,
  CreateRunResponse,
  MilpAiOutputDto,
  MilpModelOutputDto,
  Run,
  RunAggregateDto,
  RunDto,
  RunState,
  RunSummary,
  RunWorkflowStatus,
  SolverOutcome,
} from "@/types/run";
import { isTerminalRunState } from "@/types/run";
import type { MilpResultViewModel, RawFlowResult, RawMilpResult, RawSourceResult } from "@/types/milp-results";
import { mapMilpResultToViewModel } from "@/types/milp-results";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";
import type { StressTestConfig, StressTestResult, StressTestSummary } from "@/types/stress-test";
import { ServiceError } from "../errorMapping";
import {
  demandZoneRefs,
  networkLinkRefs,
  plantRefs,
  qualityProfiles,
  scenarioDetailFixtures,
  sourceRefs,
  SCENARIO_RUN_TEMPLATE,
  runFixtures,
  rawResultFixtures,
  aiAnalysisFixtures,
  diagnosticsFixtures,
  stressTestFixtures,
} from "./fixtures";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const NETWORK_DELAY_MS = 300;

// --- Scenario store ---

const scenarioStore = new Map<string, ScenarioDetail>(Object.entries(clone(scenarioDetailFixtures)));
let scenarioSeq = scenarioStore.size;

function nextScenarioId(): string {
  scenarioSeq += 1;
  return `SCN-${String(scenarioSeq).padStart(3, "0")}`;
}

// --- Run store + live (in-progress) run simulation ---

interface LiveRun {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  createdAt: number;
  templateRunId?: string;
  synthetic?: RawMilpResult;
  outcome: SolverOutcome | "failed";
  forceRerun: boolean;
}

const runStore = new Map<string, Run>(Object.entries(clone(runFixtures)));
const rawResultStore = new Map<string, RawMilpResult>(Object.entries(clone(rawResultFixtures)));
const aiAnalysisStore = new Map<string, AIAnalysisResult>(Object.entries(clone(aiAnalysisFixtures)));
const diagnosticsStore = new Map<string, DiagnosticsResult>(Object.entries(clone(diagnosticsFixtures)));
const liveRuns = new Map<string, LiveRun>();
let runSeq = Object.keys(runFixtures).length;

const QUEUED_MS = 700;
const SOLVING_MS = 1400;
const POST_SOLVE_MS = 700;
const DIAGNOSING_MS = 1100;
const ANALYSING_MS = 900;

function liveRunState(run: LiveRun): { state: RunState; progressMessage?: string } {
  const elapsed = Date.now() - run.createdAt;
  let t = QUEUED_MS;
  if (elapsed < t) return { state: "queued", progressMessage: "Waiting for an available solver slot." };
  t += SOLVING_MS;
  if (elapsed < t) return { state: "solving", progressMessage: "Solving MILP formulation…" };

  if (run.outcome === "failed") {
    return { state: "failed", progressMessage: "Solver process terminated unexpectedly." };
  }

  t += POST_SOLVE_MS;
  if (elapsed < t) {
    return run.outcome === "infeasible"
      ? { state: "infeasible", progressMessage: "No feasible solution found." }
      : { state: "solved", progressMessage: "Feasible optimum found." };
  }

  if (run.outcome === "infeasible") {
    t += DIAGNOSING_MS;
    if (elapsed < t) return { state: "diagnosing", progressMessage: "Running infeasibility diagnostics…" };
  }

  t += ANALYSING_MS;
  if (elapsed < t) return { state: "analysing", progressMessage: "Generating AI analysis…" };

  return { state: "completed" };
}

function liveRunToRun(run: LiveRun): Run {
  const { state, progressMessage } = liveRunState(run);
  const terminalOutcome: SolverOutcome | undefined = run.outcome === "failed" ? undefined : run.outcome;
  const rawResult = run.templateRunId ? rawResultFixtures[run.templateRunId] : run.synthetic;
  return {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioName: run.scenarioName,
    status: state,
    solverOutcome: state === "completed" || state === "infeasible" || state === "diagnosing" || state === "analysing" ? terminalOutcome : undefined,
    progressMessage,
    createdAt: new Date(run.createdAt).toISOString(),
    solveTimeMs: rawResult?.solve_time_ms ?? null,
    objectiveValue: rawResult?.objective_value ?? null,
    error: state === "failed" ? "Solver process terminated unexpectedly before producing a result." : undefined,
  };
}

function resolveRun(runId: string): Run {
  const live = liveRuns.get(runId);
  if (live) return liveRunToRun(live);
  const stored = runStore.get(runId);
  if (stored) return clone(stored);
  throw new ServiceError("NOT_FOUND", `Run "${runId}" was not found.`);
}

/**
 * Maps the mock's speculative pipeline stage onto the real backend's actual
 * workflow-status vocabulary, so getRunAggregate below can return a
 * RunAggregateDto shaped exactly like the real HTTP client's — infeasibility
 * is a milpOutput property in the real contract, not a workflow status, so
 * "infeasible"/"diagnosing" both map onto "milp_completed" (MILP is done;
 * there is no diagnostics stage in the real contract).
 */
function toWorkflowStatus(state: RunState): RunWorkflowStatus {
  switch (state) {
    case "queued":
      return "queued";
    case "solving":
      return "milp_running";
    case "solved":
    case "infeasible":
    case "diagnosing":
      return "milp_completed";
    case "analysing":
      return "ai_running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
  }
}

function toRunDto(run: Run, extra: { forceRerun: boolean }): RunDto {
  return {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioName: run.scenarioName ?? null,
    status: toWorkflowStatus(run.status),
    solverOutcome: run.solverOutcome ?? null,
    progressMessage: run.progressMessage ?? null,
    createdAt: run.createdAt,
    solveTimeMs: run.solveTimeMs ?? null,
    objectiveValue: run.objectiveValue ?? null,
    error: run.error ?? null,
    forceRerun: extra.forceRerun,
    milpCacheHit: false,
    aiCacheHit: false,
    milpInputId: null,
    milpOutputId: null,
    aiOutputId: null,
    reusedMilpFromRunId: null,
    reusedAiFromRunId: null,
    milpStartedAt: null,
    milpCompletedAt: null,
    aiStartedAt: null,
    aiCompletedAt: null,
  };
}

function sumOrNull(values: Array<number | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === "number");
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}

/** Best-effort mapping of the mock's old RawMilpResult shape onto MilpModelOutputDto. */
function rawResultToMilpOutputDto(raw: RawMilpResult, outcome: SolverOutcome): MilpModelOutputDto {
  const selected = raw.sources?.selected ?? [];
  const unused = raw.sources?.unused ?? [];
  const plants = raw.network?.plants ?? [];
  const demandZones = raw.network?.demand_zones ?? [];
  const now = new Date().toISOString();

  return {
    id: `mock-output-${raw.run_id}`,
    isLegacyFallback: false,
    schemaVersion: "1.0",
    scenarioExternalId: raw.scenario_id,
    scenarioStatus: null,
    executionKey: null,
    inputHash: null,
    modelParametersHash: null,
    milpModelVersion: null,
    solverName: "mock-solver",
    solverVersion: null,
    solverConfigHash: null,
    solverTerminationCondition: raw.solver_status,
    solverMessage: null,
    solveTimeMs: raw.solve_time_ms ?? null,
    rawOutputJson: raw,
    outputHash: null,
    cacheReusable: true,
    forcedRecompute: false,
    startedAt: null,
    completedAt: now,
    updatedAt: null,
    createdAt: now,
    loaderStatus: null,
    loaderScenarioReady: null,
    loaderValidationIssues: null,
    loaderChecks: null,
    preprocessingStatus: null,
    preprocessingWarnings: null,
    preprocessingChecks: null,
    outputConsistencyStatus: null,
    outputConsistencyTolerance: null,
    outputConsistencyChecks: null,
    solverStatus: raw.solver_status,
    solverIsFeasible: outcome !== "infeasible",
    solverIsOptimal: outcome === "optimal",
    solverObjectiveValue: raw.objective_value ?? null,
    totalDemandMlPerDay: sumOrNull(demandZones.map((z) => z.demand_ml_per_day)),
    totalWithdrawalMlPerDay: sumOrNull(selected.map((s) => s.withdrawal_ml_per_day)),
    totalTreatedMlPerDay: sumOrNull(plants.map((p) => p.throughput_ml_per_day)),
    totalDeliveredMlPerDay: sumOrNull(demandZones.map((z) => z.delivered_ml_per_day)),
    selectedSourceCount: selected.length,
    activePlantCount: plants.filter((p) => p.is_active).length,
    totalSourceFixedCost: raw.cost_breakdown?.total_source_fixed_cost ?? null,
    totalSourceVariableCost: raw.cost_breakdown?.total_source_withdrawal_cost ?? null,
    totalPlantFixedCost: raw.cost_breakdown?.total_plant_fixed_cost ?? null,
    totalPlantVariableCost: raw.cost_breakdown?.total_plant_treatment_cost ?? null,
    reconstructedTotalCost: raw.cost_breakdown?.reconstructed_total_cost ?? null,
    totalCost: raw.cost_breakdown?.solver_objective_value ?? raw.objective_value ?? null,
    costReconciles: raw.cost_breakdown?.cost_reconciles ?? null,
    sources: [...selected, ...unused],
    plants,
    demandZones,
    flowsSourceToPlant: raw.network?.source_to_plant_flows ?? [],
    flowsPlantToZone: raw.network?.plant_to_zone_flows ?? [],
    quality: raw.blended_quality?.results ?? [],
    bindingConstraintsSummary: raw.decision_evidence?.binding_constraint_labels ?? [],
    warnings: raw.warnings ?? [],
  };
}

function aiAnalysisToDto(ai: AIAnalysisResult): MilpAiOutputDto {
  const now = new Date().toISOString();
  return {
    id: `mock-ai-${ai.runId}`,
    status: ai.status === "ready" ? "completed" : ai.status,
    aiProvider: "mock",
    aiModel: "mock",
    aiModelVersion: null,
    promptVersion: null,
    analysisVersion: null,
    aiContractVersion: "1.0",
    milpOutputHash: null,
    aiCacheKey: null,
    aiInputJson: {},
    executiveSummary: ai.summary,
    decisionExplanation: null,
    keyFindings: ai.anomalies ?? [],
    anomalies: ai.anomalies ?? [],
    recommendations: [],
    warnings: ai.warnings ?? [],
    riskAssessment: null,
    sourceAnalysis: null,
    plantAnalysis: null,
    qualityAnalysis: null,
    limitations: null,
    rawAiJson: ai,
    aiOutputHash: null,
    cacheReusable: true,
    forcedRecompute: false,
    latencyMs: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    startedAt: null,
    completedAt: now,
    updatedAt: null,
  };
}

const MILP_VISIBLE_STATUSES: readonly RunWorkflowStatus[] = [
  "milp_completed",
  "ai_queued",
  "ai_running",
  "completed",
  "completed_with_ai_error",
];

function resolveRawResult(runId: string): RawMilpResult {
  const live = liveRuns.get(runId);
  if (live) {
    const base = live.templateRunId ? rawResultFixtures[live.templateRunId] : live.synthetic;
    if (!base) throw new ServiceError("NOT_FOUND", `No result is available for run "${runId}".`);
    return { ...clone(base), run_id: runId };
  }
  const stored = rawResultStore.get(runId);
  if (!stored) throw new ServiceError("NOT_FOUND", `No result is available for run "${runId}".`);
  return stored;
}

// --- Scenario validation ---

function reachableZones(scenario: ScenarioDetail): Set<string> {
  const enabledSourceIds = new Set(
    scenario.sources.filter((s) => s.enabled && !s.forcedInactive).map((s) => s.sourceId),
  );
  const enabledPlantIds = new Set(scenario.plants.filter((p) => p.enabled).map((p) => p.plantId));

  const reachablePlants = new Set(
    networkLinkRefs
      .filter((l) => l.kind === "source_to_plant" && enabledSourceIds.has(l.fromId) && enabledPlantIds.has(l.toId))
      .map((l) => l.toId),
  );

  return new Set(
    networkLinkRefs
      .filter((l) => l.kind === "plant_to_zone" && reachablePlants.has(l.fromId))
      .map((l) => l.toId),
  );
}

function runValidation(scenario: ScenarioDetail): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!scenario.scenarioName.trim()) {
    issues.push({ message: "Scenario name is required.", field: "scenarioName", severity: "error" });
  }

  const enabledSources = scenario.sources.filter((s) => s.enabled && !s.forcedInactive);
  if (enabledSources.length === 0) {
    issues.push({ message: "At least one source must be enabled.", field: "sources", severity: "error" });
  }

  const enabledPlants = scenario.plants.filter((p) => p.enabled);
  if (enabledPlants.length === 0) {
    issues.push({ message: "At least one treatment plant must be enabled.", field: "plants", severity: "error" });
  }

  if (scenario.demandZones.length === 0) {
    issues.push({ message: "At least one demand zone is required.", field: "demandZones", severity: "error" });
  }
  for (const zone of scenario.demandZones) {
    const ref = demandZoneRefs.find((z) => z.zoneId === zone.zoneId);
    const label = ref?.name ?? zone.zoneId;
    if (zone.demandMlPerDay === null || zone.demandMlPerDay === undefined) {
      issues.push({ message: `${label} demand has not been entered.`, field: "demandZones", severity: "error" });
    } else if (zone.demandMlPerDay <= 0) {
      issues.push({ message: `${label} demand must be greater than zero.`, field: "demandZones", severity: "error" });
    }
  }

  if (!scenario.qualityProfileId) {
    issues.push({ message: "A water-quality profile must be selected.", field: "qualityProfileId", severity: "error" });
  }

  for (const sel of enabledSources) {
    const ref = sourceRefs.find((s) => s.sourceId === sel.sourceId);
    if (ref && ref.modelReady === false) {
      issues.push({ message: `${ref.name} is missing required model data.`, field: "sources", severity: "error" });
    }
  }

  const reachable = reachableZones(scenario);
  for (const zone of scenario.demandZones) {
    if (zone.demandMlPerDay && zone.demandMlPerDay > 0 && !reachable.has(zone.zoneId)) {
      const ref = demandZoneRefs.find((z) => z.zoneId === zone.zoneId);
      const label = ref?.name ?? zone.zoneId;
      issues.push({ message: `${label} has no valid path from an available source.`, field: "demandZones", severity: "error" });
    }
  }

  return issues;
}

// --- Synthetic solving (stands in for the MILP for scenarios without a canned fixture) ---

function effectiveMax(sel: { maxWithdrawalOverrideMlPerDay?: number }, ref?: SourceRef): number {
  return sel.maxWithdrawalOverrideMlPerDay ?? ref?.defaultMaxWithdrawalMlPerDay ?? 0;
}

function synthesizeRawResult(runId: string, scenario: ScenarioDetail): { outcome: SolverOutcome; raw: RawMilpResult } {
  const enabledSources = scenario.sources.filter((s) => s.enabled && !s.forcedInactive);
  const disabledSources = scenario.sources.filter((s) => !s.enabled || s.forcedInactive);
  const enabledPlantIds = new Set(scenario.plants.filter((p) => p.enabled).map((p) => p.plantId));
  const totalDemand = scenario.demandZones.reduce((sum, z) => sum + (z.demandMlPerDay ?? 0), 0);
  const totalCapacity = enabledSources.reduce((sum, s) => sum + effectiveMax(s, sourceRefs.find((r) => r.sourceId === s.sourceId)), 0);

  const scenarioName = scenario.scenarioName;

  if (totalCapacity < totalDemand || enabledSources.length === 0) {
    const shortfall = totalDemand - totalCapacity;
    const unused: RawSourceResult[] = [
      ...enabledSources.map((s) => {
        const ref = sourceRefs.find((r) => r.sourceId === s.sourceId);
        return {
          source_id: s.sourceId,
          source_name: ref?.name,
          is_selected: false,
          withdrawal_ml_per_day: 0,
          reason: "Insufficient combined source capacity to meet total demand.",
        };
      }),
      ...disabledSources.map((s) => {
        const ref = sourceRefs.find((r) => r.sourceId === s.sourceId);
        return {
          source_id: s.sourceId,
          source_name: ref?.name,
          is_selected: false,
          withdrawal_ml_per_day: 0,
          reason: s.forcedInactive ? "Forced inactive for this scenario." : "Not enabled for this scenario.",
        };
      }),
    ];

    return {
      outcome: "infeasible",
      raw: {
        run_id: runId,
        scenario_id: scenario.scenarioId,
        scenario_name: scenarioName,
        solver_status: "infeasible",
        objective_value: null,
        solve_time_ms: Math.round(300 + Math.random() * 400),
        sources: { selected: [], unused },
        network: { plants: [], demand_zones: [], source_to_plant_flows: [], plant_to_zone_flows: [] },
        blended_quality: { results: [] },
        decision_evidence: {
          feasibility_state: "Infeasible: demand exceeds available capacity under current constraints",
          binding_constraint_labels: [`Total demand exceeds combined source capacity by ${shortfall.toFixed(1)} ML/day`],
        },
        warnings: [
          { message: `Scenario is infeasible: demand exceeds available source capacity by ${shortfall.toFixed(1)} ML/day.`, severity: "critical" },
        ],
      },
    };
  }

  const sorted = [...enabledSources].sort((a, b) => {
    const costA = sourceRefs.find((r) => r.sourceId === a.sourceId)?.cost ?? Infinity;
    const costB = sourceRefs.find((r) => r.sourceId === b.sourceId)?.cost ?? Infinity;
    return costA - costB;
  });

  let remaining = totalDemand;
  const selected: RawSourceResult[] = [];
  const unused: RawSourceResult[] = [];
  const withdrawalBySource = new Map<string, number>();

  for (const sel of sorted) {
    const ref = sourceRefs.find((r) => r.sourceId === sel.sourceId);
    const max = effectiveMax(sel, ref);
    if (remaining <= 0 || max <= 0) {
      unused.push({ source_id: sel.sourceId, source_name: ref?.name, is_selected: false, withdrawal_ml_per_day: 0, reason: "Not required to meet demand at lowest cost." });
      continue;
    }
    const withdrawal = Math.min(max, remaining);
    remaining -= withdrawal;
    withdrawalBySource.set(sel.sourceId, withdrawal);
    const cost = ref?.cost ?? 0;
    selected.push({
      source_id: sel.sourceId,
      source_name: ref?.name,
      is_selected: true,
      withdrawal_ml_per_day: Math.round(withdrawal * 100) / 100,
      blend_ratio: totalDemand > 0 ? withdrawal / totalDemand : 0,
      fixed_cost_contribution: 0,
      withdrawal_cost_contribution: Math.round(withdrawal * cost),
      min_withdrawal_ml_per_day: 0,
      max_withdrawal_ml_per_day: max,
      utilisation_percent: max > 0 ? withdrawal / max : 0,
      binding_capacity: withdrawal >= max - 1e-6,
      availability_status: ref?.availabilityStatus,
      model_ready: ref?.modelReady,
      is_estimated: ref?.isEstimated,
      provenance: ref?.provenance,
    });
  }
  for (const s of disabledSources) {
    const ref = sourceRefs.find((r) => r.sourceId === s.sourceId);
    unused.push({
      source_id: s.sourceId,
      source_name: ref?.name,
      is_selected: false,
      withdrawal_ml_per_day: 0,
      reason: s.forcedInactive ? "Forced inactive for this scenario." : "Not enabled for this scenario.",
    });
  }

  // Distribute each source's withdrawal to its linked, enabled plant.
  const plantThroughput = new Map<string, number>();
  const spFlows: RawFlowResult[] = [];
  for (const [sourceId, amount] of withdrawalBySource) {
    const link = networkLinkRefs.find((l) => l.kind === "source_to_plant" && l.fromId === sourceId && enabledPlantIds.has(l.toId));
    if (!link) continue;
    plantThroughput.set(link.toId, (plantThroughput.get(link.toId) ?? 0) + amount);
    spFlows.push({
      source_id: sourceId,
      plant_id: link.toId,
      is_active: true,
      flow_ml_per_day: Math.round(amount * 100) / 100,
      max_flow_ml_per_day: link.defaultCapacityMlPerDay,
      utilisation_percent: link.defaultCapacityMlPerDay ? amount / link.defaultCapacityMlPerDay : undefined,
    });
  }

  const plants = plantRefs
    .filter((p) => enabledPlantIds.has(p.plantId))
    .map((p) => {
      const throughput = plantThroughput.get(p.plantId) ?? 0;
      return {
        plant_id: p.plantId,
        plant_name: p.name,
        is_active: throughput > 0,
        throughput_ml_per_day: Math.round(throughput * 100) / 100,
        fixed_cost_contribution: throughput > 0 ? p.fixedActivationCost ?? 0 : 0,
        treatment_cost_contribution: Math.round(throughput * (p.treatmentCostPerMlPerDay ?? 0)),
        min_throughput_ml_per_day: p.defaultMinCapacityMlPerDay,
        max_throughput_ml_per_day: p.defaultMaxCapacityMlPerDay,
        utilisation_percent: p.defaultMaxCapacityMlPerDay ? throughput / p.defaultMaxCapacityMlPerDay : undefined,
      };
    });

  // Distribute plant throughput across its linked demand zones, proportional to each zone's share of demand.
  const demandByZone = new Map(scenario.demandZones.map((z) => [z.zoneId, z.demandMlPerDay ?? 0]));
  const deliveredByZone = new Map<string, number>();
  const pzFlows: RawFlowResult[] = [];
  for (const [plantId, throughput] of plantThroughput) {
    const links = networkLinkRefs.filter((l) => l.kind === "plant_to_zone" && l.fromId === plantId && demandByZone.has(l.toId));
    const linkedDemandTotal = links.reduce((sum, l) => sum + (demandByZone.get(l.toId) ?? 0), 0);
    for (const link of links) {
      const share = linkedDemandTotal > 0 ? (demandByZone.get(link.toId) ?? 0) / linkedDemandTotal : 0;
      const flow = throughput * share;
      deliveredByZone.set(link.toId, (deliveredByZone.get(link.toId) ?? 0) + flow);
      pzFlows.push({
        plant_id: plantId,
        zone_id: link.toId,
        is_active: flow > 0,
        flow_ml_per_day: Math.round(flow * 100) / 100,
        max_flow_ml_per_day: link.defaultCapacityMlPerDay,
        utilisation_percent: link.defaultCapacityMlPerDay ? flow / link.defaultCapacityMlPerDay : undefined,
      });
    }
  }

  const demandZones = scenario.demandZones.map((z) => {
    const demand = z.demandMlPerDay ?? 0;
    const delivered = Math.round((deliveredByZone.get(z.zoneId) ?? 0) * 100) / 100;
    const ref = demandZoneRefs.find((d) => d.zoneId === z.zoneId);
    return {
      zone_id: z.zoneId,
      zone_name: ref?.name,
      demand_ml_per_day: demand,
      delivered_ml_per_day: delivered,
      unmet_demand_ml_per_day: Math.max(0, Math.round((demand - delivered) * 100) / 100),
      surplus_ml_per_day: Math.max(0, Math.round((delivered - demand) * 100) / 100),
      demand_satisfied: delivered >= demand - 0.01,
    };
  });

  const profile = qualityProfiles.find((p) => p.profileId === scenario.qualityProfileId);
  const qualityResults = profile
    ? plants.flatMap((p) => {
        const feedingSourceIds = [...withdrawalBySource.keys()].filter(
          (sourceId) => networkLinkRefs.find((l) => l.kind === "source_to_plant" && l.fromId === sourceId && l.toId === p.plant_id) != null,
        );
        const feedingTotal = feedingSourceIds.reduce((sum, id) => sum + (withdrawalBySource.get(id) ?? 0), 0);
        return profile.parameters.map((param) => {
          const weightedSum = feedingSourceIds.reduce((sum, id) => {
            const ref = sourceRefs.find((r) => r.sourceId === id);
            const value =
              param.parameterId === "pH"
                ? ref?.quality?.pH
                : param.parameterId === "alkalinity"
                  ? ref?.quality?.alkalinityMgPerLCaCO3
                  : param.parameterId === "turbidity"
                    ? ref?.quality?.turbidityNtu
                    : undefined;
            return sum + (value ?? 0) * (withdrawalBySource.get(id) ?? 0);
          }, 0);
          const blended = feedingTotal > 0 ? weightedSum / feedingTotal : 0;
          const isBinding =
            (param.lowerLimit !== undefined && blended - param.lowerLimit < (param.upperLimit ?? blended + 1) * 0.05) ||
            (param.upperLimit !== undefined && param.upperLimit - blended < (param.upperLimit - (param.lowerLimit ?? 0)) * 0.1);
          return {
            plant_id: p.plant_id,
            parameter_id: param.parameterId,
            unit: param.unit,
            blended_value: Math.round(blended * 100) / 100,
            lower_limit: param.lowerLimit,
            upper_limit: param.upperLimit,
            lower_margin: param.lowerLimit !== undefined ? Math.round((blended - param.lowerLimit) * 100) / 100 : undefined,
            upper_margin: param.upperLimit !== undefined ? Math.round((param.upperLimit - blended) * 100) / 100 : undefined,
            is_binding: isBinding,
          };
        });
      })
    : [];

  const totalSourceWithdrawalCost = selected.reduce((sum, s) => sum + (s.withdrawal_cost_contribution ?? 0), 0);
  const totalPlantFixedCost = plants.reduce((sum, p) => sum + (p.fixed_cost_contribution ?? 0), 0);
  const totalPlantTreatmentCost = plants.reduce((sum, p) => sum + (p.treatment_cost_contribution ?? 0), 0);
  const totalCost = totalSourceWithdrawalCost + totalPlantFixedCost + totalPlantTreatmentCost;

  const warnings: NonNullable<RawMilpResult["warnings"]> = [];
  for (const zone of demandZones) {
    if ((zone.unmet_demand_ml_per_day ?? 0) > 0.05) {
      warnings.push({ message: `${zone.zone_name ?? zone.zone_id} demand unmet by ${zone.unmet_demand_ml_per_day} ML/day.`, severity: "warning" });
    }
  }

  return {
    outcome: "optimal",
    raw: {
      run_id: runId,
      scenario_id: scenario.scenarioId,
      scenario_name: scenarioName,
      solver_status: "optimal",
      objective_value: Math.round(totalCost),
      solve_time_ms: Math.round(500 + Math.random() * 600),
      sources: { selected, unused },
      network: { plants, demand_zones: demandZones, source_to_plant_flows: spFlows, plant_to_zone_flows: pzFlows },
      blended_quality: { results: qualityResults },
      cost_breakdown: {
        total_source_fixed_cost: 0,
        total_source_withdrawal_cost: totalSourceWithdrawalCost,
        total_plant_fixed_cost: totalPlantFixedCost,
        total_plant_treatment_cost: totalPlantTreatmentCost,
        reconstructed_total_cost: Math.round(totalCost),
        solver_objective_value: Math.round(totalCost),
        cost_reconciles: true,
      },
      decision_evidence: {
        feasibility_state: "Feasible: synthesized allocation",
        utilisation_percent: totalCapacity > 0 ? totalDemand / totalCapacity : undefined,
      },
      warnings,
    },
  };
}

// --- AquaBlendClient implementation ---

export const mockAquaBlendClient: AquaBlendClient = {
  async getSources(filters?: SourceFilters): Promise<SourceRef[]> {
    await delay(NETWORK_DELAY_MS);
    let results = clone(sourceRefs);
    if (filters?.sourceType) results = results.filter((s) => s.sourceType === filters.sourceType);
    if (filters?.availability) results = results.filter((s) => s.availabilityStatus === filters.availability);
    if (typeof filters?.modelReady === "boolean") results = results.filter((s) => s.modelReady === filters.modelReady);
    if (filters?.estimatedOrMeasured && filters.estimatedOrMeasured !== "all") {
      const wantEstimated = filters.estimatedOrMeasured === "estimated";
      results = results.filter((s) => Boolean(s.isEstimated) === wantEstimated);
    }
    return results;
  },

  async getPlants(): Promise<PlantRef[]> {
    await delay(NETWORK_DELAY_MS);
    return clone(plantRefs);
  },

  async getDemandZones(): Promise<DemandZoneRef[]> {
    await delay(NETWORK_DELAY_MS);
    return clone(demandZoneRefs);
  },

  async getNetworkLinks(): Promise<NetworkLinkRef[]> {
    await delay(NETWORK_DELAY_MS);
    return clone(networkLinkRefs);
  },

  async getQualityProfiles(): Promise<QualityProfile[]> {
    await delay(NETWORK_DELAY_MS);
    return clone(qualityProfiles);
  },

  async getScenarios(): Promise<ScenarioSummary[]> {
    await delay(NETWORK_DELAY_MS);
    const allRuns = [...runStore.values(), ...[...liveRuns.values()].map(liveRunToRun)];
    return [...scenarioStore.values()]
      .map((s) => {
        const runsForScenario = allRuns.filter((r) => r.scenarioId === s.scenarioId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const mostRecent = runsForScenario[0];
        return {
          scenarioId: s.scenarioId,
          scenarioName: s.scenarioName,
          status: s.status,
          description: s.description,
          updatedAt: s.updatedAt,
          mostRecentRun: mostRecent ? { runId: mostRecent.runId, status: mostRecent.status, createdAt: mostRecent.createdAt } : null,
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getScenario(scenarioId: string): Promise<ScenarioDetail> {
    await delay(NETWORK_DELAY_MS);
    const scenario = scenarioStore.get(scenarioId);
    if (!scenario) throw new ServiceError("NOT_FOUND", `Scenario "${scenarioId}" was not found.`);
    return clone(scenario);
  },

  async createScenario(form: ScenarioFormState): Promise<ScenarioDetail> {
    await delay(NETWORK_DELAY_MS);
    const now = new Date().toISOString();
    const scenario: ScenarioDetail = {
      ...clone(form),
      scenarioId: nextScenarioId(),
      status: "draft",
      validationIssues: [],
      createdAt: now,
      updatedAt: now,
    };
    scenarioStore.set(scenario.scenarioId, scenario);
    return clone(scenario);
  },

  async updateScenario(scenarioId: string, form: ScenarioFormState): Promise<ScenarioDetail> {
    await delay(NETWORK_DELAY_MS);
    const existing = scenarioStore.get(scenarioId);
    if (!existing) throw new ServiceError("NOT_FOUND", `Scenario "${scenarioId}" was not found.`);
    const updated: ScenarioDetail = {
      ...existing,
      ...clone(form),
      status: "draft",
      validationIssues: [],
      updatedAt: new Date().toISOString(),
    };
    scenarioStore.set(scenarioId, updated);
    return clone(updated);
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    await delay(NETWORK_DELAY_MS);
    if (!scenarioStore.has(scenarioId)) throw new ServiceError("NOT_FOUND", `Scenario "${scenarioId}" was not found.`);
    scenarioStore.delete(scenarioId);
  },

  async validateScenario(scenarioId: string): Promise<ValidationResult> {
    await delay(NETWORK_DELAY_MS + 200);
    const scenario = scenarioStore.get(scenarioId);
    if (!scenario) throw new ServiceError("NOT_FOUND", `Scenario "${scenarioId}" was not found.`);
    const issues = runValidation(scenario);
    const valid = !issues.some((i) => i.severity === "error");
    scenario.status = valid ? "ready" : "invalid";
    scenario.validationIssues = issues;
    scenario.updatedAt = new Date().toISOString();
    scenarioStore.set(scenarioId, scenario);
    return { valid, issues };
  },

  async createRun(scenarioId: string, requestBody?: CreateRunRequestDto): Promise<CreateRunResponse> {
    await delay(NETWORK_DELAY_MS);
    const scenario = scenarioStore.get(scenarioId);
    if (!scenario) throw new ServiceError("NOT_FOUND", `Scenario "${scenarioId}" was not found.`);
    if (scenario.status !== "ready") {
      throw new ServiceError("RUN_CREATION_FAILED", "The scenario must pass validation before an optimisation can be run.");
    }

    const forceRerun = requestBody?.forceRerun ?? false;
    runSeq += 1;
    const runId = `RUN-${String(1000 + runSeq)}`;
    const templateRunId = SCENARIO_RUN_TEMPLATE[scenarioId];

    if (templateRunId) {
      liveRuns.set(runId, {
        runId,
        scenarioId,
        scenarioName: scenario.scenarioName,
        createdAt: Date.now(),
        templateRunId,
        forceRerun,
        outcome: runFixtures[templateRunId].status === "failed" ? "failed" : (runFixtures[templateRunId].solverOutcome ?? "optimal"),
      });
    } else {
      const { outcome, raw } = synthesizeRawResult(runId, scenario);
      liveRuns.set(runId, {
        runId,
        scenarioId,
        scenarioName: scenario.scenarioName,
        createdAt: Date.now(),
        synthetic: raw,
        forceRerun,
        outcome,
      });
      rawResultStore.set(runId, raw);
    }

    return { runId, status: "accepted" };
  },

  async getScenarioRuns(scenarioId: string): Promise<RunSummary[]> {
    await delay(NETWORK_DELAY_MS);
    const stored = [...runStore.values()].filter((r) => r.scenarioId === scenarioId);
    const live = [...liveRuns.values()].filter((r) => r.scenarioId === scenarioId).map(liveRunToRun);
    return [...stored, ...live]
      .map((r) => ({
        runId: r.runId,
        scenarioId: r.scenarioId,
        status: r.status,
        solverOutcome: r.solverOutcome,
        createdAt: r.createdAt,
        forceRerun: liveRuns.get(r.runId)?.forceRerun ?? false,
        milpCacheHit: false,
        aiCacheHit: false,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getRun(runId: string): Promise<Run> {
    await delay(150);
    return resolveRun(runId);
  },

  async getRunAggregate(runId: string): Promise<RunAggregateDto> {
    await delay(150);
    const run = resolveRun(runId);
    const scenario = scenarioStore.get(run.scenarioId) ?? null;
    const runDto = toRunDto(run, { forceRerun: liveRuns.get(runId)?.forceRerun ?? false });

    let milpOutput: MilpModelOutputDto | null = null;
    if (MILP_VISIBLE_STATUSES.includes(runDto.status as RunWorkflowStatus)) {
      try {
        const raw = resolveRawResult(runId);
        milpOutput = rawResultToMilpOutputDto(raw, run.solverOutcome ?? "optimal");
      } catch {
        milpOutput = null;
      }
    }

    let aiOutput: MilpAiOutputDto | null = null;
    if (runDto.status === "completed") {
      const fixture = aiAnalysisStore.get(runId);
      if (fixture) aiOutput = aiAnalysisToDto(fixture);
    }

    return {
      run: runDto,
      scenario: scenario ? clone(scenario) : null,
      // The mock does not model an immutable per-run input snapshot; the
      // aggregate endpoint's `input == null` path is exercised by the mock
      // exactly like a legacy run (AquaBlend_Frontend_Final_Integration_
      // Implementation.md §24).
      input: null,
      milpOutput,
      aiOutput,
    };
  },

  async getResults(runId: string): Promise<MilpResultViewModel> {
    await delay(NETWORK_DELAY_MS);
    const run = resolveRun(runId);
    if (!isTerminalRunState(run.status)) {
      throw new ServiceError("OPTIMISATION_FAILED", "The result was requested before the run reached a terminal state.");
    }
    if (run.status === "failed") {
      throw new ServiceError("OPTIMISATION_FAILED", run.error ?? "The solver failed to produce a result for this run.");
    }
    return mapMilpResultToViewModel(resolveRawResult(runId));
  },

  async getAIAnalysis(runId: string): Promise<AIAnalysisResult> {
    await delay(NETWORK_DELAY_MS + 200);
    const run = resolveRun(runId);
    if (run.status === "failed") {
      throw new ServiceError("AI_ANALYSIS_FAILED", "AI analysis is unavailable: this run did not produce a result.");
    }
    const fixture = aiAnalysisStore.get(runId);
    if (fixture) return clone(fixture);
    if (run.status !== "completed") {
      throw new ServiceError("AI_ANALYSIS_FAILED", "AI analysis has not been generated for this run yet.");
    }
    // Synthetic fallback for user-created scenarios without a canned analysis fixture.
    return {
      runId,
      status: "ready",
      summary:
        run.solverOutcome === "infeasible"
          ? "This scenario could not be solved. See the diagnostics above for the deterministic reason."
          : `This run produced a feasible allocation${run.objectiveValue != null ? ` at an objective cost of ${run.objectiveValue}` : ""}. See the sections above for the deterministic detail.`,
      anomalies: [],
      warnings: [],
    };
  },

  async getDiagnostics(runId: string): Promise<DiagnosticsResult> {
    await delay(NETWORK_DELAY_MS + 200);
    const run = resolveRun(runId);
    if (run.solverOutcome !== "infeasible") {
      throw new ServiceError("DIAGNOSTICS_FAILED", "Diagnostics are only available for infeasible runs.");
    }
    const fixture = diagnosticsStore.get(runId);
    if (fixture) return clone(fixture);
    if (run.status !== "completed" && run.status !== "diagnosing" && run.status !== "analysing") {
      throw new ServiceError("DIAGNOSTICS_FAILED", "Diagnostics have not been generated for this run yet.");
    }
    const raw = resolveRawResult(runId);
    return {
      runId,
      status: "ready",
      summary: raw.decision_evidence?.feasibility_state ?? "No feasible allocation exists under the current scenario constraints.",
      likelyCauses: raw.decision_evidence?.binding_constraint_labels ?? [],
      findings: [],
      suggestedInvestigation: ["Relax source withdrawal overrides, reduce demand, or enable additional sources for this scenario."],
    };
  },

  async createStressTest(runId: string, config: StressTestConfig): Promise<StressTestSummary> {
    await delay(NETWORK_DELAY_MS);
    const run = resolveRun(runId);
    if (run.status !== "completed" || run.solverOutcome !== "optimal") {
      throw new ServiceError("STRESS_TEST_FAILED", "Stress testing requires a completed run with a feasible result.");
    }
    const stressTestId = `STRESS-${String(1000 + stressTestStore.size + 1)}`;
    const createdAt = new Date().toISOString();
    const result: StressTestResult = { stressTestId, runId, config, status: "queued", createdAt };
    stressTestStore.set(stressTestId, result);
    liveStressTests.set(stressTestId, { startedAt: Date.now(), runId, config });
    return { stressTestId, runId, kind: config.kind, status: "queued", createdAt };
  },

  async getRunStressTests(runId: string): Promise<StressTestSummary[]> {
    await delay(NETWORK_DELAY_MS);
    return [...stressTestStore.values()]
      .filter((s) => s.runId === runId)
      .map((s) => resolveStressTest(s.stressTestId))
      .map((s) => ({ stressTestId: s.stressTestId, runId: s.runId, kind: s.config.kind, status: s.status, createdAt: s.createdAt }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getStressTest(stressTestId: string): Promise<StressTestResult> {
    await delay(200);
    return resolveStressTest(stressTestId);
  },
};

// --- Stress test simulation ---

interface LiveStressTest {
  startedAt: number;
  runId: string;
  config: StressTestConfig;
}

const stressTestStore = new Map<string, StressTestResult>(stressTestFixtures.map((s) => [s.stressTestId, clone(s)]));
const liveStressTests = new Map<string, LiveStressTest>();

const STRESS_QUEUED_MS = 400;
const STRESS_RUNNING_MS = 1200;

function computeStressOutcome(runId: string, config: StressTestConfig): { feasible: boolean; objectiveChangePercent?: number; criticalConstraint?: string } {
  let raw: RawMilpResult | undefined;
  try {
    raw = resolveRawResult(runId);
  } catch {
    raw = undefined;
  }
  const baselineSelected = raw?.sources?.selected ?? [];
  const totalWithdrawal = baselineSelected.reduce((sum, s) => sum + (s.withdrawal_ml_per_day ?? 0), 0);

  switch (config.kind) {
    case "increase_demand": {
      const pct = config.variationPercent ?? 10;
      const feasible = pct <= 20;
      return feasible ? { feasible: true, objectiveChangePercent: Math.round(pct * 1.6 * 10) / 10 } : { feasible: false, criticalConstraint: "Combined source capacity" };
    }
    case "disable_source": {
      const source = baselineSelected.find((s) => s.source_id === config.targetId);
      const share = source && totalWithdrawal > 0 ? (source.withdrawal_ml_per_day ?? 0) / totalWithdrawal : 0;
      const feasible = share < 0.3;
      return feasible
        ? { feasible: true, objectiveChangePercent: Math.round(share * 100 * 1.2 * 10) / 10 }
        : { feasible: false, criticalConstraint: "Demand zone(s) fed by this source" };
    }
    case "reduce_plant_capacity": {
      const pct = config.variationPercent ?? 20;
      const feasible = pct <= 30;
      return feasible ? { feasible: true, objectiveChangePercent: Math.round(pct * 0.8 * 10) / 10 } : { feasible: false, criticalConstraint: "Plant throughput capacity" };
    }
    case "reduce_link_capacity": {
      const pct = config.variationPercent ?? 20;
      const feasible = pct <= 40;
      return feasible ? { feasible: true, objectiveChangePercent: Math.round(pct * 0.5 * 10) / 10 } : { feasible: false, criticalConstraint: "Network link capacity" };
    }
    case "stricter_quality_limits": {
      const feasible = Math.random() > 0.35;
      return feasible ? { feasible: true, objectiveChangePercent: Math.round(Math.random() * 8 * 10) / 10 } : { feasible: false, criticalConstraint: "Water-quality limit" };
    }
    default:
      return { feasible: true };
  }
}

function resolveStressTest(stressTestId: string): StressTestResult {
  const stored = stressTestStore.get(stressTestId);
  if (!stored) throw new ServiceError("NOT_FOUND", `Stress test "${stressTestId}" was not found.`);
  const live = liveStressTests.get(stressTestId);
  if (!live) return clone(stored);

  const elapsed = Date.now() - live.startedAt;
  if (elapsed < STRESS_QUEUED_MS) {
    return { ...stored, status: "queued" };
  }
  if (elapsed < STRESS_QUEUED_MS + STRESS_RUNNING_MS) {
    return { ...stored, status: "running" };
  }

  const outcome = computeStressOutcome(live.runId, live.config);
  const completed: StressTestResult = { ...stored, status: "completed", ...outcome };
  stressTestStore.set(stressTestId, completed);
  liveStressTests.delete(stressTestId);
  return completed;
}
