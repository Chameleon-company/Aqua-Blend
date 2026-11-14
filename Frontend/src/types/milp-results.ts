/**
 * Isolated MILP Results boundary.
 *
 * The exact Results JSON contract from the solver/backend is not final yet.
 * `RawMilpResult` describes the best-known shape of that contract today;
 * every field is optional because we don't want to assume more than we know.
 * `mapMilpResultToViewModel()` is the ONLY place that reads `RawMilpResult` —
 * every component in the app renders `MilpResultViewModel` instead. When the
 * real contract lands, only this file should need to change.
 */

export interface RawSourceResult {
  source_id: string;
  source_name?: string;
  is_selected?: boolean;
  withdrawal_ml_per_day?: number;
  blend_ratio?: number;
  fixed_cost_contribution?: number;
  withdrawal_cost_contribution?: number;
  min_withdrawal_ml_per_day?: number;
  max_withdrawal_ml_per_day?: number;
  utilisation_percent?: number;
  cost_rank?: number;
  binding_capacity?: boolean;
  availability_status?: string;
  model_ready?: boolean;
  is_estimated?: boolean;
  provenance?: string;
  decision_evidence?: string[];
  reason_code?: string;
  reason?: string;
}

export interface RawPlantResult {
  plant_id: string;
  plant_name?: string;
  is_active?: boolean;
  throughput_ml_per_day?: number;
  fixed_cost_contribution?: number;
  treatment_cost_contribution?: number;
  min_throughput_ml_per_day?: number;
  max_throughput_ml_per_day?: number;
  utilisation_percent?: number;
}

export interface RawDemandZoneResult {
  zone_id: string;
  zone_name?: string;
  demand_ml_per_day?: number;
  delivered_ml_per_day?: number;
  unmet_demand_ml_per_day?: number;
  surplus_ml_per_day?: number;
  demand_satisfied?: boolean;
  demand_must_be_met?: boolean;
}

export interface RawFlowResult {
  source_id?: string;
  plant_id?: string;
  zone_id?: string;
  is_active?: boolean;
  flow_ml_per_day?: number;
  max_flow_ml_per_day?: number;
  utilisation_percent?: number;
  binding_capacity?: boolean;
}

export interface RawQualityResult {
  plant_id: string;
  parameter_id: string;
  unit: string;
  blended_value?: number;
  lower_limit?: number;
  upper_limit?: number;
  lower_margin?: number;
  upper_margin?: number;
  is_binding?: boolean;
}

export interface RawCostBreakdown {
  total_source_fixed_cost?: number;
  total_source_withdrawal_cost?: number;
  total_plant_fixed_cost?: number;
  total_plant_treatment_cost?: number;
  reconstructed_total_cost?: number;
  solver_objective_value?: number;
  cost_reconciles?: boolean;
}

export interface RawDecisionEvidence {
  binding_quality_limits?: string[];
  sources_at_max_withdrawal?: string[];
  sources_at_min_withdrawal?: string[];
  plants_at_max_throughput?: string[];
  links_at_max_flow?: string[];
  utilisation_percent?: number;
  cost_rank?: number;
  feasibility_state?: string;
  binding_constraint_labels?: string[];
}

export interface RawWarning {
  message: string;
  code?: string;
  severity?: "info" | "warning" | "critical";
}

/** Best-known shape of the not-yet-final MILP Results JSON contract. */
export interface RawMilpResult {
  run_id: string;
  scenario_id: string;
  scenario_name?: string;
  solver_status: string;
  objective_value?: number | null;
  solve_time_ms?: number | null;
  sources?: { selected?: RawSourceResult[]; unused?: RawSourceResult[] };
  network?: {
    plants?: RawPlantResult[];
    demand_zones?: RawDemandZoneResult[];
    source_to_plant_flows?: RawFlowResult[];
    plant_to_zone_flows?: RawFlowResult[];
  };
  blended_quality?: { results?: RawQualityResult[] };
  cost_breakdown?: RawCostBreakdown;
  decision_evidence?: RawDecisionEvidence;
  warnings?: RawWarning[];
  notes?: string[];
}

// --- Stable view model consumed by every display component ---

export interface SourceAllocation {
  sourceId: string;
  sourceName?: string;
  isSelected: boolean;
  withdrawalMlPerDay: number;
  blendRatio: number;
  fixedCostContribution: number;
  withdrawalCostContribution: number;
  minWithdrawalMlPerDay?: number;
  maxWithdrawalMlPerDay?: number;
  utilisationPercent?: number;
  costRank?: number;
  bindingCapacity?: boolean;
  availabilityStatus?: string;
  modelReady?: boolean;
  isEstimated?: boolean;
  provenance?: string;
  decisionEvidence?: string[];
  reasonCode?: string;
  reason?: string;
}

export interface PlantUtilisation {
  plantId: string;
  plantName?: string;
  isActive: boolean;
  throughputMlPerDay: number;
  fixedCostContribution: number;
  treatmentCostContribution: number;
  minThroughputMlPerDay?: number;
  maxThroughputMlPerDay?: number;
  utilisationPercent?: number;
}

export interface DemandFulfilment {
  zoneId: string;
  zoneName?: string;
  demandMlPerDay: number;
  deliveredMlPerDay: number;
  unmetDemandMlPerDay?: number;
  surplusMlPerDay?: number;
  demandSatisfied?: boolean;
  demandMustBeMet?: boolean;
}

export interface SourcePlantFlow {
  sourceId: string;
  plantId: string;
  isActive: boolean;
  flowMlPerDay: number;
  maxFlowMlPerDay?: number;
  utilisationPercent?: number;
  bindingCapacity?: boolean;
}

export interface PlantZoneFlow {
  plantId: string;
  zoneId: string;
  isActive: boolean;
  flowMlPerDay: number;
  maxFlowMlPerDay?: number;
  utilisationPercent?: number;
}

export type QualityParameterId = "pH" | "alkalinity" | "turbidity" | string;

export interface QualityResult {
  plantId: string;
  parameterId: QualityParameterId;
  unit: string;
  blendedValue: number;
  lowerLimit?: number;
  upperLimit?: number;
  lowerMargin?: number;
  upperMargin?: number;
  isBinding?: boolean;
}

export interface CostBreakdown {
  totalSourceFixedCost: number;
  totalSourceWithdrawalCost: number;
  totalPlantFixedCost: number;
  totalPlantTreatmentCost: number;
  reconstructedTotalCost: number;
  solverObjectiveValue: number;
  costReconciles: boolean;
}

export interface DecisionEvidenceSummary {
  bindingQualityLimits?: string[];
  sourcesAtMaxWithdrawal?: string[];
  sourcesAtMinWithdrawal?: string[];
  plantsAtMaxThroughput?: string[];
  linksAtMaxFlow?: string[];
  utilisationPercent?: number;
  costRank?: number;
  feasibilityState?: string;
  bindingConstraintLabels?: string[];
}

export type WarningSeverity = "info" | "warning" | "critical";

export interface RunWarning {
  message: string;
  code?: string;
  severity?: WarningSeverity;
}

export interface MilpResultViewModel {
  runId: string;
  scenarioId: string;
  scenarioName?: string;
  solverStatus: string;
  objectiveValue?: number | null;
  solveTimeMs?: number | null;
  selectedSources: SourceAllocation[];
  unusedSources: SourceAllocation[];
  plants: PlantUtilisation[];
  demandZones: DemandFulfilment[];
  sourceToPlantFlows: SourcePlantFlow[];
  plantToZoneFlows: PlantZoneFlow[];
  qualityResults: QualityResult[];
  costBreakdown?: CostBreakdown;
  decisionEvidence?: DecisionEvidenceSummary;
  warnings: RunWarning[];
  notes?: string[];
}

function mapSource(raw: RawSourceResult): SourceAllocation {
  return {
    sourceId: raw.source_id,
    sourceName: raw.source_name,
    isSelected: raw.is_selected ?? false,
    withdrawalMlPerDay: raw.withdrawal_ml_per_day ?? 0,
    blendRatio: raw.blend_ratio ?? 0,
    fixedCostContribution: raw.fixed_cost_contribution ?? 0,
    withdrawalCostContribution: raw.withdrawal_cost_contribution ?? 0,
    minWithdrawalMlPerDay: raw.min_withdrawal_ml_per_day,
    maxWithdrawalMlPerDay: raw.max_withdrawal_ml_per_day,
    utilisationPercent: raw.utilisation_percent,
    costRank: raw.cost_rank,
    bindingCapacity: raw.binding_capacity,
    availabilityStatus: raw.availability_status,
    modelReady: raw.model_ready,
    isEstimated: raw.is_estimated,
    provenance: raw.provenance,
    decisionEvidence: raw.decision_evidence,
    reasonCode: raw.reason_code,
    reason: raw.reason,
  };
}

function mapPlant(raw: RawPlantResult): PlantUtilisation {
  return {
    plantId: raw.plant_id,
    plantName: raw.plant_name,
    isActive: raw.is_active ?? false,
    throughputMlPerDay: raw.throughput_ml_per_day ?? 0,
    fixedCostContribution: raw.fixed_cost_contribution ?? 0,
    treatmentCostContribution: raw.treatment_cost_contribution ?? 0,
    minThroughputMlPerDay: raw.min_throughput_ml_per_day,
    maxThroughputMlPerDay: raw.max_throughput_ml_per_day,
    utilisationPercent: raw.utilisation_percent,
  };
}

function mapDemandZone(raw: RawDemandZoneResult): DemandFulfilment {
  return {
    zoneId: raw.zone_id,
    zoneName: raw.zone_name,
    demandMlPerDay: raw.demand_ml_per_day ?? 0,
    deliveredMlPerDay: raw.delivered_ml_per_day ?? 0,
    unmetDemandMlPerDay: raw.unmet_demand_ml_per_day,
    surplusMlPerDay: raw.surplus_ml_per_day,
    demandSatisfied: raw.demand_satisfied,
    demandMustBeMet: raw.demand_must_be_met,
  };
}

function mapSourcePlantFlow(raw: RawFlowResult): SourcePlantFlow {
  return {
    sourceId: raw.source_id ?? "",
    plantId: raw.plant_id ?? "",
    isActive: raw.is_active ?? false,
    flowMlPerDay: raw.flow_ml_per_day ?? 0,
    maxFlowMlPerDay: raw.max_flow_ml_per_day,
    utilisationPercent: raw.utilisation_percent,
    bindingCapacity: raw.binding_capacity,
  };
}

function mapPlantZoneFlow(raw: RawFlowResult): PlantZoneFlow {
  return {
    plantId: raw.plant_id ?? "",
    zoneId: raw.zone_id ?? "",
    isActive: raw.is_active ?? false,
    flowMlPerDay: raw.flow_ml_per_day ?? 0,
    maxFlowMlPerDay: raw.max_flow_ml_per_day,
    utilisationPercent: raw.utilisation_percent,
  };
}

function mapQuality(raw: RawQualityResult): QualityResult {
  return {
    plantId: raw.plant_id,
    parameterId: raw.parameter_id,
    unit: raw.unit,
    blendedValue: raw.blended_value ?? 0,
    lowerLimit: raw.lower_limit,
    upperLimit: raw.upper_limit,
    lowerMargin: raw.lower_margin,
    upperMargin: raw.upper_margin,
    isBinding: raw.is_binding,
  };
}

function mapCostBreakdown(raw?: RawCostBreakdown): CostBreakdown | undefined {
  if (!raw) return undefined;
  return {
    totalSourceFixedCost: raw.total_source_fixed_cost ?? 0,
    totalSourceWithdrawalCost: raw.total_source_withdrawal_cost ?? 0,
    totalPlantFixedCost: raw.total_plant_fixed_cost ?? 0,
    totalPlantTreatmentCost: raw.total_plant_treatment_cost ?? 0,
    reconstructedTotalCost: raw.reconstructed_total_cost ?? 0,
    solverObjectiveValue: raw.solver_objective_value ?? 0,
    costReconciles: raw.cost_reconciles ?? false,
  };
}

function mapDecisionEvidence(raw?: RawDecisionEvidence): DecisionEvidenceSummary | undefined {
  if (!raw) return undefined;
  return {
    bindingQualityLimits: raw.binding_quality_limits,
    sourcesAtMaxWithdrawal: raw.sources_at_max_withdrawal,
    sourcesAtMinWithdrawal: raw.sources_at_min_withdrawal,
    plantsAtMaxThroughput: raw.plants_at_max_throughput,
    linksAtMaxFlow: raw.links_at_max_flow,
    utilisationPercent: raw.utilisation_percent,
    costRank: raw.cost_rank,
    feasibilityState: raw.feasibility_state,
    bindingConstraintLabels: raw.binding_constraint_labels,
  };
}

export function mapMilpResultToViewModel(raw: RawMilpResult): MilpResultViewModel {
  return {
    runId: raw.run_id,
    scenarioId: raw.scenario_id,
    scenarioName: raw.scenario_name,
    solverStatus: raw.solver_status,
    objectiveValue: raw.objective_value ?? null,
    solveTimeMs: raw.solve_time_ms ?? null,
    selectedSources: (raw.sources?.selected ?? []).map(mapSource),
    unusedSources: (raw.sources?.unused ?? []).map(mapSource),
    plants: (raw.network?.plants ?? []).map(mapPlant),
    demandZones: (raw.network?.demand_zones ?? []).map(mapDemandZone),
    sourceToPlantFlows: (raw.network?.source_to_plant_flows ?? []).map(mapSourcePlantFlow),
    plantToZoneFlows: (raw.network?.plant_to_zone_flows ?? []).map(mapPlantZoneFlow),
    qualityResults: (raw.blended_quality?.results ?? []).map(mapQuality),
    costBreakdown: mapCostBreakdown(raw.cost_breakdown),
    decisionEvidence: mapDecisionEvidence(raw.decision_evidence),
    warnings: raw.warnings ?? [],
    notes: raw.notes,
  };
}
