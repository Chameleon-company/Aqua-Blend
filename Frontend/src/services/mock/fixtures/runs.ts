import type { Run } from "@/types/run";
import type { RawMilpResult } from "@/types/milp-results";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";

export const runFixtures: Record<string, Run> = {
  "RUN-1001": {
    runId: "RUN-1001",
    scenarioId: "SCN-001",
    scenarioName: "Tomorrow's Supply (Zone 1 Priority)",
    status: "completed",
    solverOutcome: "optimal",
    createdAt: "2026-08-22T21:15:00Z",
    solveTimeMs: 842,
    objectiveValue: 34344,
  },
  "RUN-1002": {
    runId: "RUN-1002",
    scenarioId: "SCN-003",
    scenarioName: "Drought Contingency",
    status: "completed",
    solverOutcome: "infeasible",
    createdAt: "2026-08-22T22:02:00Z",
    solveTimeMs: 410,
    objectiveValue: null,
  },
  "RUN-1003": {
    runId: "RUN-1003",
    scenarioId: "SCN-002",
    scenarioName: "Weekly Baseline",
    status: "failed",
    createdAt: "2026-08-22T20:40:00Z",
    solveTimeMs: null,
    objectiveValue: null,
    error: "Solver process terminated unexpectedly before producing a result.",
  },
  "RUN-1004": {
    runId: "RUN-1004",
    scenarioId: "SCN-001",
    scenarioName: "Tomorrow's Supply (Zone 1 Priority)",
    status: "completed",
    solverOutcome: "optimal",
    createdAt: "2026-08-23T06:05:00Z",
    solveTimeMs: 915,
    objectiveValue: 35110,
  },
};

/** Which scenario a newly-created run should resolve to, keyed by scenario id. */
export const SCENARIO_RUN_TEMPLATE: Record<string, keyof typeof runFixtures> = {
  "SCN-001": "RUN-1001",
  "SCN-002": "RUN-1003",
  "SCN-003": "RUN-1002",
};

export const rawResultFixtures: Record<string, RawMilpResult> = {
  "RUN-1001": {
    run_id: "RUN-1001",
    scenario_id: "SCN-001",
    scenario_name: "Tomorrow's Supply (Zone 1 Priority)",
    solver_status: "optimal",
    objective_value: 34344,
    solve_time_ms: 842,
    sources: {
      selected: [
        {
          source_id: "SRC-BORE-01",
          source_name: "Northfield Borefield",
          is_selected: true,
          withdrawal_ml_per_day: 32.4,
          blend_ratio: 32.4 / 127,
          fixed_cost_contribution: 500,
          withdrawal_cost_contribution: 6804,
          min_withdrawal_ml_per_day: 0,
          max_withdrawal_ml_per_day: 40,
          utilisation_percent: 32.4 / 40,
          cost_rank: 2,
          binding_capacity: false,
          availability_status: "Available",
          model_ready: true,
          is_estimated: false,
          provenance: "Measured (SCADA)",
          decision_evidence: ["Below maximum withdrawal capacity"],
        },
        {
          source_id: "SRC-RES-02",
          source_name: "Highland Reservoir",
          is_selected: true,
          withdrawal_ml_per_day: 58,
          blend_ratio: 58 / 127,
          fixed_cost_contribution: 650,
          withdrawal_cost_contribution: 8700,
          min_withdrawal_ml_per_day: 0,
          max_withdrawal_ml_per_day: 58,
          utilisation_percent: 1,
          cost_rank: 1,
          binding_capacity: true,
          availability_status: "Available",
          model_ready: true,
          is_estimated: false,
          provenance: "Measured (Laboratory)",
          decision_evidence: ["At maximum available withdrawal"],
        },
        {
          source_id: "SRC-RIV-03",
          source_name: "Coldwater River Intake",
          is_selected: true,
          withdrawal_ml_per_day: 24.6,
          blend_ratio: 24.6 / 127,
          fixed_cost_contribution: 480,
          withdrawal_cost_contribution: 4305,
          min_withdrawal_ml_per_day: 0,
          max_withdrawal_ml_per_day: 50,
          utilisation_percent: 24.6 / 50,
          cost_rank: 3,
          binding_capacity: false,
          availability_status: "Seasonal",
          model_ready: true,
          is_estimated: false,
          provenance: "Measured (SCADA)",
        },
        {
          source_id: "SRC-DES-04",
          source_name: "Bayside Desalination",
          is_selected: true,
          withdrawal_ml_per_day: 12,
          blend_ratio: 12 / 127,
          fixed_cost_contribution: 900,
          withdrawal_cost_contribution: 4080,
          min_withdrawal_ml_per_day: 0,
          max_withdrawal_ml_per_day: 30,
          utilisation_percent: 12 / 30,
          cost_rank: 4,
          binding_capacity: false,
          availability_status: "Available",
          model_ready: true,
          is_estimated: false,
          provenance: "Measured (Plant telemetry)",
        },
      ],
      unused: [
        {
          source_id: "SRC-REC-05",
          source_name: "Eastvale Recycled Water",
          is_selected: false,
          withdrawal_ml_per_day: 0,
          reason_code: "NOT_MODEL_READY",
          reason: "Source excluded from the solved solution: not model-ready.",
          availability_status: "Limited",
        },
        {
          source_id: "SRC-EMG-06",
          source_name: "Emergency Bore Reserve",
          is_selected: false,
          withdrawal_ml_per_day: 0,
          availability_status: "Unavailable",
        },
      ],
    },
    network: {
      plants: [
        {
          plant_id: "PLANT-A",
          plant_name: "Northfield Treatment Plant",
          is_active: true,
          throughput_ml_per_day: 57,
          fixed_cost_contribution: 1200,
          treatment_cost_contribution: 2565,
          min_throughput_ml_per_day: 0,
          max_throughput_ml_per_day: 90,
          utilisation_percent: 57 / 90,
        },
        {
          plant_id: "PLANT-B",
          plant_name: "Central Treatment Plant",
          is_active: true,
          throughput_ml_per_day: 70,
          fixed_cost_contribution: 1500,
          treatment_cost_contribution: 2660,
          min_throughput_ml_per_day: 0,
          max_throughput_ml_per_day: 85,
          utilisation_percent: 70 / 85,
        },
      ],
      demand_zones: [
        { zone_id: "ZONE-1", zone_name: "Zone 1 (CBD)", demand_ml_per_day: 40, delivered_ml_per_day: 40, unmet_demand_ml_per_day: 0, surplus_ml_per_day: 0, demand_satisfied: true, demand_must_be_met: true },
        { zone_id: "ZONE-2", zone_name: "Zone 2 (Northern Suburbs)", demand_ml_per_day: 40, delivered_ml_per_day: 37, unmet_demand_ml_per_day: 3, surplus_ml_per_day: 0, demand_satisfied: false, demand_must_be_met: false },
        { zone_id: "ZONE-3", zone_name: "Zone 3 (Coastal)", demand_ml_per_day: 48, delivered_ml_per_day: 50, unmet_demand_ml_per_day: 0, surplus_ml_per_day: 2, demand_satisfied: true, demand_must_be_met: true },
      ],
      source_to_plant_flows: [
        { source_id: "SRC-BORE-01", plant_id: "PLANT-A", is_active: true, flow_ml_per_day: 32.4, max_flow_ml_per_day: 40, utilisation_percent: 32.4 / 40 },
        { source_id: "SRC-RIV-03", plant_id: "PLANT-A", is_active: true, flow_ml_per_day: 24.6, max_flow_ml_per_day: 50, utilisation_percent: 24.6 / 50 },
        { source_id: "SRC-RES-02", plant_id: "PLANT-B", is_active: true, flow_ml_per_day: 58, max_flow_ml_per_day: 58, utilisation_percent: 1, binding_capacity: true },
        { source_id: "SRC-DES-04", plant_id: "PLANT-B", is_active: true, flow_ml_per_day: 12, max_flow_ml_per_day: 30, utilisation_percent: 12 / 30 },
      ],
      plant_to_zone_flows: [
        { plant_id: "PLANT-A", zone_id: "ZONE-1", is_active: true, flow_ml_per_day: 40, max_flow_ml_per_day: 60, utilisation_percent: 40 / 60 },
        { plant_id: "PLANT-A", zone_id: "ZONE-2", is_active: true, flow_ml_per_day: 17, max_flow_ml_per_day: 40, utilisation_percent: 17 / 40 },
        { plant_id: "PLANT-B", zone_id: "ZONE-2", is_active: true, flow_ml_per_day: 20, max_flow_ml_per_day: 40, utilisation_percent: 20 / 40 },
        { plant_id: "PLANT-B", zone_id: "ZONE-3", is_active: true, flow_ml_per_day: 50, max_flow_ml_per_day: 55, utilisation_percent: 50 / 55 },
      ],
    },
    blended_quality: {
      results: [
        { plant_id: "PLANT-A", parameter_id: "pH", unit: "pH", blended_value: 7.42, lower_limit: 6.5, upper_limit: 8.5, lower_margin: 0.92, upper_margin: 1.08, is_binding: false },
        { plant_id: "PLANT-A", parameter_id: "alkalinity", unit: "mg/L CaCO3", blended_value: 148, lower_limit: 50, upper_limit: 200, lower_margin: 98, upper_margin: 52, is_binding: false },
        { plant_id: "PLANT-A", parameter_id: "turbidity", unit: "NTU", blended_value: 3.1, lower_limit: 0, upper_limit: 5, lower_margin: 3.1, upper_margin: 1.9, is_binding: true },
        { plant_id: "PLANT-B", parameter_id: "pH", unit: "pH", blended_value: 7.55, lower_limit: 6.5, upper_limit: 8.5, lower_margin: 1.05, upper_margin: 0.95, is_binding: false },
        { plant_id: "PLANT-B", parameter_id: "alkalinity", unit: "mg/L CaCO3", blended_value: 112.5, lower_limit: 50, upper_limit: 200, lower_margin: 62.5, upper_margin: 87.5, is_binding: false },
        { plant_id: "PLANT-B", parameter_id: "turbidity", unit: "NTU", blended_value: 2.0, lower_limit: 0, upper_limit: 5, lower_margin: 2.0, upper_margin: 3.0, is_binding: false },
      ],
    },
    cost_breakdown: {
      total_source_fixed_cost: 2530,
      total_source_withdrawal_cost: 23889,
      total_plant_fixed_cost: 2700,
      total_plant_treatment_cost: 5225,
      reconstructed_total_cost: 34344,
      solver_objective_value: 34344,
      cost_reconciles: true,
    },
    decision_evidence: {
      binding_quality_limits: ["PLANT-A turbidity: near upper limit"],
      sources_at_max_withdrawal: ["SRC-RES-02"],
      sources_at_min_withdrawal: [],
      plants_at_max_throughput: [],
      links_at_max_flow: ["SRC-RES-02 -> PLANT-B"],
      utilisation_percent: 0.824,
      cost_rank: 1,
      feasibility_state: "Feasible: optimal solution found",
      binding_constraint_labels: ["Zone 2 demand (soft constraint)", "PLANT-A turbidity upper limit"],
    },
    warnings: [
      { message: "Zone 2 demand narrowly unmet by 3.00 ML/day (soft constraint).", severity: "warning" },
      { message: "Eastvale Recycled Water excluded: source data not model-ready.", severity: "info" },
    ],
    notes: ["Water-quality figures reflect blend at plant inflow only; post-treatment values are not modelled in this contract."],
  },

  "RUN-1002": {
    run_id: "RUN-1002",
    scenario_id: "SCN-003",
    scenario_name: "Drought Contingency",
    solver_status: "infeasible",
    objective_value: null,
    solve_time_ms: 410,
    sources: { selected: [], unused: [] },
    network: { plants: [], demand_zones: [], source_to_plant_flows: [], plant_to_zone_flows: [] },
    blended_quality: { results: [] },
    decision_evidence: {
      feasibility_state: "Infeasible: demand exceeds available capacity under current constraints",
      binding_constraint_labels: ["Total demand exceeds combined source capacity by 18.4 ML/day"],
    },
    warnings: [
      { message: "Scenario is infeasible: total demand exceeds available source capacity.", severity: "critical" },
      { message: "Emergency Bore Reserve unavailable: excluded from consideration.", severity: "info" },
    ],
    notes: ["Drought contingency scenario intentionally stresses available capacity for testing."],
  },

  "RUN-1004": {
    run_id: "RUN-1004",
    scenario_id: "SCN-001",
    scenario_name: "Tomorrow's Supply (Zone 1 Priority)",
    solver_status: "optimal",
    objective_value: 35110,
    solve_time_ms: 915,
    sources: {
      selected: [
        { source_id: "SRC-BORE-01", source_name: "Northfield Borefield", is_selected: true, withdrawal_ml_per_day: 30, blend_ratio: 30 / 122, fixed_cost_contribution: 500, withdrawal_cost_contribution: 6300, model_ready: true, is_estimated: false },
        { source_id: "SRC-RES-02", source_name: "Highland Reservoir", is_selected: true, withdrawal_ml_per_day: 58, blend_ratio: 58 / 122, fixed_cost_contribution: 650, withdrawal_cost_contribution: 8700, model_ready: true, is_estimated: false },
        { source_id: "SRC-RIV-03", source_name: "Coldwater River Intake", is_selected: true, withdrawal_ml_per_day: 34, blend_ratio: 34 / 122, fixed_cost_contribution: 480, withdrawal_cost_contribution: 5950 },
      ],
      unused: [
        { source_id: "SRC-DES-04", source_name: "Bayside Desalination", is_selected: false, withdrawal_ml_per_day: 0 },
        { source_id: "SRC-REC-05", source_name: "Eastvale Recycled Water", is_selected: false, withdrawal_ml_per_day: 0, reason_code: "NOT_MODEL_READY", reason: "Source excluded from the solved solution: not model-ready." },
        { source_id: "SRC-EMG-06", source_name: "Emergency Bore Reserve", is_selected: false, withdrawal_ml_per_day: 0 },
      ],
    },
    network: {
      plants: [
        { plant_id: "PLANT-A", plant_name: "Northfield Treatment Plant", is_active: true, throughput_ml_per_day: 64, fixed_cost_contribution: 1200, treatment_cost_contribution: 2880 },
        { plant_id: "PLANT-B", plant_name: "Central Treatment Plant", is_active: true, throughput_ml_per_day: 58, fixed_cost_contribution: 1500, treatment_cost_contribution: 2204 },
      ],
      demand_zones: [
        { zone_id: "ZONE-1", zone_name: "Zone 1 (CBD)", demand_ml_per_day: 40, delivered_ml_per_day: 40, demand_satisfied: true },
        { zone_id: "ZONE-2", zone_name: "Zone 2 (Northern Suburbs)", demand_ml_per_day: 40, delivered_ml_per_day: 34, unmet_demand_ml_per_day: 6, demand_satisfied: false },
        { zone_id: "ZONE-3", zone_name: "Zone 3 (Coastal)", demand_ml_per_day: 48, delivered_ml_per_day: 48, demand_satisfied: true },
      ],
      source_to_plant_flows: [
        { source_id: "SRC-BORE-01", plant_id: "PLANT-A", is_active: true, flow_ml_per_day: 30 },
        { source_id: "SRC-RIV-03", plant_id: "PLANT-A", is_active: true, flow_ml_per_day: 34 },
        { source_id: "SRC-RES-02", plant_id: "PLANT-B", is_active: true, flow_ml_per_day: 58 },
      ],
      plant_to_zone_flows: [
        { plant_id: "PLANT-A", zone_id: "ZONE-1", is_active: true, flow_ml_per_day: 40 },
        { plant_id: "PLANT-A", zone_id: "ZONE-2", is_active: true, flow_ml_per_day: 24 },
        { plant_id: "PLANT-B", zone_id: "ZONE-2", is_active: true, flow_ml_per_day: 10 },
        { plant_id: "PLANT-B", zone_id: "ZONE-3", is_active: true, flow_ml_per_day: 48 },
      ],
    },
    blended_quality: {
      results: [
        { plant_id: "PLANT-A", parameter_id: "pH", unit: "pH", blended_value: 7.5, lower_limit: 6.5, upper_limit: 8.5, is_binding: false },
        { plant_id: "PLANT-A", parameter_id: "turbidity", unit: "NTU", blended_value: 3.4, lower_limit: 0, upper_limit: 5 },
        { plant_id: "PLANT-B", parameter_id: "pH", unit: "pH", blended_value: 7.3, lower_limit: 6.5, upper_limit: 8.5, lower_margin: 0.8, upper_margin: 1.2, is_binding: false },
      ],
    },
    cost_breakdown: {
      total_source_fixed_cost: 1630,
      total_source_withdrawal_cost: 20950,
      total_plant_fixed_cost: 2700,
      total_plant_treatment_cost: 5084,
      reconstructed_total_cost: 30364,
      solver_objective_value: 35110,
      cost_reconciles: false,
    },
    warnings: [
      { message: "Cost reconciliation mismatch: reconstructed total does not match the solver objective value.", severity: "critical" },
      { message: "Some source metadata is incomplete for Coldwater River Intake.", severity: "info" },
      { message: "Zone 2 demand unmet by 6.00 ML/day.", severity: "warning" },
    ],
    notes: ["Rerun performed with a relaxed source-availability override applied to Coldwater River Intake."],
  },
};

export const aiAnalysisFixtures: Record<string, AIAnalysisResult> = {
  "RUN-1001": {
    runId: "RUN-1001",
    status: "ready",
    summary:
      "The plan draws most heavily on Highland Reservoir, which is used at its full available withdrawal because it offers the lowest delivered cost per ML among the sources considered. Northfield Borefield and Coldwater River Intake supplement the blend within their available capacity, and Bayside Desalination tops up the remainder. Zone 2 receives slightly less than its full demand because meeting it in full would have required a more expensive source mix than the model's cost/benefit threshold allows; this is a soft constraint, not a failure. All blended water-quality values remain within configured limits, though turbidity at the Northfield plant sits close to its upper bound.",
    anomalies: [
      { id: "AN-1", message: "Northfield plant turbidity is within limit but binding (close to upper bound).", severity: "warning", relatedEntity: "PLANT-A" },
      { id: "AN-2", message: "Zone 2 demand met at 92.5% of requirement under a soft demand constraint.", severity: "info", relatedEntity: "ZONE-2" },
    ],
    warnings: [],
    confidence: "high",
    estimatedDataDisclosure: false,
    supportingEvidence: [
      "Highland Reservoir operating at maximum available withdrawal.",
      "Zone 2 demand met at 92.5% of requirement under a soft demand constraint.",
      "Northfield plant turbidity is within limit but binding (close to upper bound).",
    ],
  },
  "RUN-1002": {
    runId: "RUN-1002",
    status: "ready",
    summary:
      "This scenario could not be solved. See the diagnostics above for the deterministic reason: total demand exceeds the combined available source capacity under the overrides applied in this scenario.",
    anomalies: [
      { id: "AN-3", message: "Total demand exceeds combined source capacity by 18.4 ML/day.", severity: "critical" },
    ],
    warnings: [],
    estimatedDataDisclosure: false,
  },
  "RUN-1004": {
    runId: "RUN-1004",
    status: "ready",
    summary:
      "This rerun relaxes Coldwater River Intake's availability, increasing overall withdrawal cost. Zone 2 remains under-delivered and the reconstructed cost total does not match the solver's objective value for this run — treat cost figures as provisional until the mismatch is resolved upstream.",
    anomalies: [
      { id: "AN-4", message: "Cost reconciliation mismatch on this run's cost breakdown.", severity: "critical" },
      { id: "AN-5", message: "Zone 2 demand unmet by 6.00 ML/day, more than the previous run for this scenario.", severity: "warning", relatedEntity: "ZONE-2" },
    ],
    warnings: [],
    estimatedDataDisclosure: false,
  },
};

export const diagnosticsFixtures: Record<string, DiagnosticsResult> = {
  "RUN-1002": {
    runId: "RUN-1002",
    status: "ready",
    summary: "No feasible allocation exists that meets all demand zones within current source and plant limits.",
    likelyCauses: [
      "Combined available source capacity is lower than total demand after this scenario's withdrawal overrides.",
      "Emergency Bore Reserve is unavailable and cannot supplement supply.",
    ],
    findings: [
      {
        id: "DF-1",
        description: "Zone 1, Zone 2, and Zone 3 combined demand (145 ML/day) exceeds available source capacity (126.6 ML/day) by 18.4 ML/day.",
        affectedSources: ["SRC-BORE-01", "SRC-RES-02", "SRC-RIV-03", "SRC-DES-04"],
      },
      {
        id: "DF-2",
        description: "Emergency Bore Reserve is flagged unavailable and was excluded before solving.",
        affectedSources: ["SRC-EMG-06"],
      },
    ],
    suggestedInvestigation: [
      "Relax the withdrawal overrides applied to Northfield Borefield, Highland Reservoir, or Coldwater River Intake.",
      "Reduce demand for one or more zones for this scenario.",
      "Confirm whether Emergency Bore Reserve can be brought online for this scenario.",
    ],
  },
};
