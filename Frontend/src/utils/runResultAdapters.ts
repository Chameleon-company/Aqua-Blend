/**
 * Adapts the REAL backend's aggregate run contract (RunAggregateDto ->
 * MilpModelOutputDto / MilpAiOutputDto, types/run.ts) into the
 * MilpResultViewModel / AIAnalysisResult shapes the /runs/[runId]/results/*
 * pages and their chart components already render.
 *
 * Those pages were built against a speculative pre-real-backend contract
 * (types/milp-results.ts's RawMilpResult, types/ai-analysis.ts's
 * AIAnalysisResult) via the legacy GET /api/runs/{id}/results and
 * /ai-analysis endpoints. Those endpoints only ever read the old
 * public.OptimisationResults table (Backend/Services/RunService.cs's
 * GetResultJsonAsync — "never written to for new architecture runs"), so
 * every run created through the current pipeline 409s with "The result was
 * requested before the run reached a terminal state" regardless of whether
 * it actually completed. The fix is this file: read the SAME aggregate data
 * the (already working) /runs/[runId] overview page uses, and reshape it
 * into the view models these richer chart pages expect, rather than
 * rewriting every chart component. See useRunPolling.ts for where this is
 * wired in.
 */
import { asArray, asRecord, pickBoolean, pickNumber, pickString } from "./jsonAccess";
import { toTextList, readAiReportSnapshot, formatConfidenceFlag } from "./aiReport";
import { normalizeQuality } from "@/components/runs/MilpQualityResults";
import type {
  DemandFulfilment,
  MilpResultViewModel,
  PlantUtilisation,
  PlantZoneFlow,
  QualityResult,
  RunWarning,
  SourceAllocation,
  SourcePlantFlow,
} from "@/types/milp-results";
import type { AIAnalysisResult, Anomaly } from "@/types/ai-analysis";
import type { MilpAiOutputDto, MilpModelOutputDto, RunDto } from "@/types/run";

function toSourceAllocation(raw: unknown): SourceAllocation {
  const r = asRecord(raw);
  const isSelected = pickBoolean(r, "activated", "is_selected", "model_included") ?? false;
  return {
    sourceId: pickString(r, "source_id", "sourceId") ?? "",
    sourceName: pickString(r, "source_name", "sourceName") ?? undefined,
    isSelected,
    withdrawalMlPerDay: pickNumber(r, "withdrawal_ml_per_day") ?? 0,
    blendRatio: pickNumber(r, "blend_ratio") ?? 0,
    fixedCostContribution: pickNumber(r, "fixed_cost_contribution") ?? 0,
    withdrawalCostContribution: pickNumber(r, "variable_withdrawal_cost", "withdrawal_cost_contribution") ?? 0,
    minWithdrawalMlPerDay: pickNumber(r, "min_withdrawal_ml_per_day") ?? undefined,
    maxWithdrawalMlPerDay: pickNumber(r, "max_withdrawal_ml_per_day") ?? undefined,
    utilisationPercent: pickNumber(r, "utilisation_percent") ?? undefined,
    costRank: pickNumber(r, "cost_rank") ?? undefined,
    bindingCapacity: pickBoolean(r, "binding_capacity") ?? undefined,
    availabilityStatus: pickString(r, "availability_status") ?? undefined,
    modelReady: pickBoolean(r, "model_ready") ?? undefined,
    isEstimated: pickBoolean(r, "is_estimated") ?? undefined,
    provenance: pickString(r, "provenance") ?? undefined,
    reasonCode: pickString(r, "exclusion_reason_code", "reason_code") ?? undefined,
    reason: pickString(r, "selection_status", "reason") ?? undefined,
  };
}

function toPlantUtilisation(raw: unknown): PlantUtilisation {
  const r = asRecord(raw);
  return {
    plantId: pickString(r, "plant_id", "plantId") ?? "",
    plantName: pickString(r, "plant_name", "plantName") ?? undefined,
    isActive: pickBoolean(r, "activated", "is_active") ?? false,
    throughputMlPerDay: pickNumber(r, "throughput_ml_per_day") ?? 0,
    fixedCostContribution: pickNumber(r, "fixed_cost_contribution") ?? 0,
    treatmentCostContribution: pickNumber(r, "variable_treatment_cost", "treatment_cost_contribution") ?? 0,
    minThroughputMlPerDay: pickNumber(r, "min_throughput_ml_per_day") ?? undefined,
    maxThroughputMlPerDay: pickNumber(r, "max_throughput_ml_per_day") ?? undefined,
    utilisationPercent: pickNumber(r, "utilisation_percent") ?? undefined,
  };
}

function toDemandFulfilment(raw: unknown): DemandFulfilment {
  const r = asRecord(raw);
  return {
    zoneId: pickString(r, "zone_id", "zoneId") ?? "",
    zoneName: pickString(r, "zone_name", "zoneName") ?? undefined,
    demandMlPerDay: pickNumber(r, "demand_ml_per_day") ?? 0,
    deliveredMlPerDay: pickNumber(r, "delivered_ml_per_day") ?? 0,
    unmetDemandMlPerDay: pickNumber(r, "unmet_demand_ml_per_day") ?? undefined,
    surplusMlPerDay: pickNumber(r, "surplus_ml_per_day") ?? undefined,
    demandSatisfied: pickBoolean(r, "demand_satisfied") ?? undefined,
    demandMustBeMet: pickBoolean(r, "demand_must_be_met") ?? undefined,
  };
}

function toSourcePlantFlow(raw: unknown): SourcePlantFlow {
  const r = asRecord(raw);
  return {
    sourceId: pickString(r, "source_id", "sourceId") ?? "",
    plantId: pickString(r, "plant_id", "plantId") ?? "",
    isActive: pickBoolean(r, "activated", "is_active") ?? false,
    flowMlPerDay: pickNumber(r, "flow_ml_per_day") ?? 0,
    maxFlowMlPerDay: pickNumber(r, "max_flow_ml_per_day") ?? undefined,
    utilisationPercent: pickNumber(r, "utilisation_percent") ?? undefined,
    bindingCapacity: pickBoolean(r, "binding_capacity") ?? undefined,
  };
}

function toPlantZoneFlow(raw: unknown): PlantZoneFlow {
  const r = asRecord(raw);
  return {
    plantId: pickString(r, "plant_id", "plantId") ?? "",
    zoneId: pickString(r, "zone_id", "zoneId") ?? "",
    isActive: pickBoolean(r, "activated", "is_active") ?? false,
    flowMlPerDay: pickNumber(r, "flow_ml_per_day") ?? 0,
    maxFlowMlPerDay: pickNumber(r, "max_flow_ml_per_day") ?? undefined,
    utilisationPercent: pickNumber(r, "utilisation_percent") ?? undefined,
  };
}

/** Reuses MilpQualityResults.tsx's own real-contract normaliser rather than re-guessing the shape. */
function toQualityResults(raw: unknown): QualityResult[] {
  return normalizeQuality(raw).map((row) => ({
    plantId: row.plantId,
    parameterId: row.parameterId,
    unit: row.unit ?? "",
    blendedValue: row.value ?? 0,
    lowerLimit: row.lowerLimit ?? undefined,
    upperLimit: row.upperLimit ?? undefined,
    isBinding: row.isBinding ?? undefined,
  }));
}

function toWarnings(raw: unknown): RunWarning[] {
  return asArray(raw).map((item) => {
    if (typeof item === "string") return { message: item };
    const r = asRecord(item);
    const message = pickString(r, "message", "label", "description") ?? JSON.stringify(item);
    const severity = r.severity === "info" || r.severity === "warning" || r.severity === "critical" ? r.severity : undefined;
    return { message, severity };
  });
}

/**
 * Builds the MilpResultViewModel every /results/milp chart component
 * consumes, directly from the real MilpModelOutputDto — no legacy
 * /api/runs/{id}/results call involved.
 */
export function mapMilpOutputToViewModel(run: Pick<RunDto, "runId" | "scenarioId" | "scenarioName">, output: MilpModelOutputDto): MilpResultViewModel {
  const allSources = asArray(output.sources).map(toSourceAllocation);
  const bindingConstraintLabels = asArray(output.bindingConstraintsSummary)
    .map((item) => (typeof item === "string" ? item : pickString(asRecord(item), "message", "label", "description")))
    .filter((v): v is string => !!v);

  return {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioName: run.scenarioName ?? undefined,
    solverStatus: output.solverStatus ?? "unknown",
    objectiveValue: output.solverObjectiveValue,
    solveTimeMs: output.solveTimeMs,
    selectedSources: allSources.filter((s) => s.isSelected),
    unusedSources: allSources.filter((s) => !s.isSelected),
    plants: asArray(output.plants).map(toPlantUtilisation),
    demandZones: asArray(output.demandZones).map(toDemandFulfilment),
    sourceToPlantFlows: asArray(output.flowsSourceToPlant).map(toSourcePlantFlow),
    plantToZoneFlows: asArray(output.flowsPlantToZone).map(toPlantZoneFlow),
    qualityResults: toQualityResults(output.quality),
    costBreakdown: {
      totalSourceFixedCost: output.totalSourceFixedCost ?? 0,
      totalSourceWithdrawalCost: output.totalSourceVariableCost ?? 0,
      totalPlantFixedCost: output.totalPlantFixedCost ?? 0,
      totalPlantTreatmentCost: output.totalPlantVariableCost ?? 0,
      reconstructedTotalCost: output.reconstructedTotalCost ?? 0,
      solverObjectiveValue: output.solverObjectiveValue ?? 0,
      costReconciles: output.costReconciles ?? false,
    },
    decisionEvidence: bindingConstraintLabels.length > 0 ? { bindingConstraintLabels, feasibilityState: output.solverMessage ?? undefined } : undefined,
    warnings: toWarnings(output.warnings),
    notes: undefined,
  };
}

function toAnomalies(raw: unknown): Anomaly[] {
  return toTextList(raw).map((message, index) => ({ id: `anomaly-${index}`, message, severity: "info" }));
}

/**
 * Builds the AIAnalysisResult the /results/ai page consumes, directly from
 * the real MilpAiOutputDto — no legacy /api/runs/{id}/ai-analysis call
 * involved (that endpoint is a documented backend stub returning 501).
 */
export function mapAiOutputToAiAnalysisResult(runId: string, workflowStatus: string, aiOutput: MilpAiOutputDto | null): AIAnalysisResult {
  if (!aiOutput) {
    const status = workflowStatus === "ai_queued" || workflowStatus === "ai_running" ? "pending" : workflowStatus === "completed_with_ai_error" ? "failed" : "unavailable";
    return { runId, status, summary: null, anomalies: [] };
  }

  const summary = aiOutput.executiveSummary?.trim() || aiOutput.decisionExplanation?.trim() || null;
  const snapshot = readAiReportSnapshot(aiOutput.rawAiJson);
  const warnings = toTextList(aiOutput.warnings);

  return {
    runId,
    status: "ready",
    summary,
    anomalies: toAnomalies(aiOutput.anomalies),
    warnings,
    confidence: formatConfidenceFlag(snapshot.confidenceFlag) ?? undefined,
    estimatedDataDisclosure: warnings.some((w) => w.toLowerCase().includes("estimated")),
    supportingEvidence: toTextList(aiOutput.keyFindings),
  };
}
