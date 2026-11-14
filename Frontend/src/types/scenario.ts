/**
 * Scenario contracts.
 *
 * A scenario represents user-defined test conditions — editable choices
 * referencing reference data by ID, never a duplicated copy of that
 * reference data (names, costs, quality, provenance stay in reference-data.ts
 * and are looked up, not stored here). The backend combines this with
 * Supabase reference data and system-generated fields to build the canonical
 * ScenarioData; the frontend never needs to hold that full canonical shape.
 */

export type ScenarioStatus = "draft" | "ready" | "invalid" | "archived";

export interface ScenarioSourceSelection {
  sourceId: string;
  enabled: boolean;
  forcedInactive?: boolean;
  minWithdrawalOverrideMlPerDay?: number;
  maxWithdrawalOverrideMlPerDay?: number;
}

export interface ScenarioPlantSelection {
  plantId: string;
  enabled: boolean;
  minCapacityOverrideMlPerDay?: number;
  maxCapacityOverrideMlPerDay?: number;
}

export interface ScenarioDemandSelection {
  zoneId: string;
  demandMlPerDay: number | null;
}

export type NetworkOverrideKind = "source_plant_outage" | "plant_zone_outage" | "capacity_override";

/** Advanced-only: simulated outage or capacity override on an existing physical link. */
export interface NetworkOverride {
  linkId: string;
  kind: NetworkOverrideKind;
  capacityOverrideMlPerDay?: number;
}

/** The complete set of user-editable scenario choices — not a duplicated ScenarioData. */
export interface ScenarioFormState {
  scenarioName: string;
  description: string;
  sources: ScenarioSourceSelection[];
  plants: ScenarioPlantSelection[];
  demandZones: ScenarioDemandSelection[];
  qualityProfileId: string | null;
  networkOverrides: NetworkOverride[];
}

export function emptyScenarioFormState(): ScenarioFormState {
  return {
    scenarioName: "",
    description: "",
    sources: [],
    plants: [],
    demandZones: [],
    qualityProfileId: null,
    networkOverrides: [],
  };
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  message: string;
  field?: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ScenarioRunRef {
  runId: string;
  status: string;
  createdAt: string;
}

export interface ScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  status: ScenarioStatus;
  description?: string;
  updatedAt: string;
  mostRecentRun?: ScenarioRunRef | null;
}

/** Server-owned fields layered on top of the editable form state. Not user-editable. */
export interface ScenarioDetail extends ScenarioFormState {
  scenarioId: string;
  status: ScenarioStatus;
  validationIssues: ValidationIssue[];
  createdAt: string;
  updatedAt: string;
}

export function toScenarioFormState(detail: ScenarioDetail): ScenarioFormState {
  return {
    scenarioName: detail.scenarioName,
    description: detail.description,
    sources: detail.sources,
    plants: detail.plants,
    demandZones: detail.demandZones,
    qualityProfileId: detail.qualityProfileId,
    networkOverrides: detail.networkOverrides,
  };
}
