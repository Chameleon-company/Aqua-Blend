/**
 * Canonical reference data — Supabase/backend-owned facts the scenario
 * builder reads but never lets the user re-enter (physical topology, costs,
 * quality definitions, provenance, model readiness). The frontend consumes
 * this as display + selection data only; the network topology here is not
 * user-editable except through a scenario's `networkOverrides`.
 */

export interface SourceQuality {
  pH?: number;
  alkalinityMgPerLCaCO3?: number;
  turbidityNtu?: number;
}

export interface SourceRef {
  sourceId: string;
  name: string;
  sourceType?: string;
  availabilityStatus?: string;
  modelReady?: boolean;
  defaultMinWithdrawalMlPerDay?: number;
  defaultMaxWithdrawalMlPerDay?: number;
  cost?: number;
  quality?: SourceQuality;
  isEstimated?: boolean;
  provenance?: string;
}

export interface PlantRef {
  plantId: string;
  name: string;
  defaultMinCapacityMlPerDay?: number;
  defaultMaxCapacityMlPerDay?: number;
  fixedActivationCost?: number;
  treatmentCostPerMlPerDay?: number;
}

export interface DemandZoneRef {
  zoneId: string;
  name: string;
}

export interface QualityParameterDef {
  parameterId: string;
  label: string;
  unit: string;
  lowerLimit?: number;
  upperLimit?: number;
}

export interface QualityProfile {
  profileId: string;
  name: string;
  description?: string;
  parameters: QualityParameterDef[];
}

export type NetworkLinkKind = "source_to_plant" | "plant_to_zone";

/** Physical topology fact, e.g. "Source A -> Plant 1". Not user-created. */
export interface NetworkLinkRef {
  linkId: string;
  kind: NetworkLinkKind;
  fromId: string;
  fromName?: string;
  toId: string;
  toName?: string;
  defaultCapacityMlPerDay?: number;
}

export interface SourceFilters {
  sourceType?: string;
  availability?: string;
  modelReady?: boolean;
  estimatedOrMeasured?: "estimated" | "measured" | "all";
}
