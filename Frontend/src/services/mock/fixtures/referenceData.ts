/**
 * Canonical reference data fixtures — stands in for Supabase/backend data
 * the scenario builder reads but never lets the user re-enter.
 */
import type {
  DemandZoneRef,
  NetworkLinkRef,
  PlantRef,
  QualityProfile,
  SourceRef,
} from "@/types/reference-data";

export const sourceRefs: SourceRef[] = [
  {
    sourceId: "SRC-BORE-01",
    name: "Northfield Borefield",
    sourceType: "Groundwater",
    availabilityStatus: "Available",
    modelReady: true,
    defaultMinWithdrawalMlPerDay: 0,
    defaultMaxWithdrawalMlPerDay: 40,
    cost: 210,
    quality: { pH: 7.6, alkalinityMgPerLCaCO3: 180, turbidityNtu: 0.8 },
    isEstimated: false,
    provenance: "Measured (SCADA)",
  },
  {
    sourceId: "SRC-RES-02",
    name: "Highland Reservoir",
    sourceType: "Surface Water",
    availabilityStatus: "Available",
    modelReady: true,
    defaultMinWithdrawalMlPerDay: 0,
    defaultMaxWithdrawalMlPerDay: 58,
    cost: 150,
    quality: { pH: 7.1, alkalinityMgPerLCaCO3: 95, turbidityNtu: 3.2 },
    isEstimated: false,
    provenance: "Measured (Laboratory)",
  },
  {
    sourceId: "SRC-RIV-03",
    name: "Coldwater River Intake",
    sourceType: "Surface Water",
    availabilityStatus: "Seasonal",
    modelReady: true,
    defaultMinWithdrawalMlPerDay: 0,
    defaultMaxWithdrawalMlPerDay: 50,
    cost: 175,
    quality: { pH: 7.4, alkalinityMgPerLCaCO3: 110, turbidityNtu: 5.6 },
    isEstimated: false,
    provenance: "Measured (SCADA)",
  },
  {
    sourceId: "SRC-DES-04",
    name: "Bayside Desalination",
    sourceType: "Desalination",
    availabilityStatus: "Available",
    modelReady: true,
    defaultMinWithdrawalMlPerDay: 0,
    defaultMaxWithdrawalMlPerDay: 30,
    cost: 340,
    quality: { pH: 8.0, alkalinityMgPerLCaCO3: 60, turbidityNtu: 0.3 },
    isEstimated: false,
    provenance: "Measured (Plant telemetry)",
  },
  {
    sourceId: "SRC-REC-05",
    name: "Eastvale Recycled Water",
    sourceType: "Recycled",
    availabilityStatus: "Limited",
    modelReady: false,
    defaultMinWithdrawalMlPerDay: 0,
    defaultMaxWithdrawalMlPerDay: 20,
    cost: 260,
    quality: { pH: 7.8, alkalinityMgPerLCaCO3: 140, turbidityNtu: 1.5 },
    isEstimated: true,
    provenance: "Estimated (model default)",
  },
  {
    sourceId: "SRC-EMG-06",
    name: "Emergency Bore Reserve",
    sourceType: "Groundwater",
    availabilityStatus: "Unavailable",
    modelReady: false,
    isEstimated: true,
    provenance: "Estimated (no recent sample)",
  },
];

export const plantRefs: PlantRef[] = [
  {
    plantId: "PLANT-A",
    name: "Northfield Treatment Plant",
    defaultMinCapacityMlPerDay: 0,
    defaultMaxCapacityMlPerDay: 90,
    fixedActivationCost: 1200,
    treatmentCostPerMlPerDay: 45,
  },
  {
    plantId: "PLANT-B",
    name: "Central Treatment Plant",
    defaultMinCapacityMlPerDay: 0,
    defaultMaxCapacityMlPerDay: 85,
    fixedActivationCost: 1500,
    treatmentCostPerMlPerDay: 38,
  },
];

export const demandZoneRefs: DemandZoneRef[] = [
  { zoneId: "ZONE-1", name: "Zone 1 (CBD)" },
  { zoneId: "ZONE-2", name: "Zone 2 (Northern Suburbs)" },
  { zoneId: "ZONE-3", name: "Zone 3 (Coastal)" },
];

export const qualityProfiles: QualityProfile[] = [
  {
    profileId: "QP-STANDARD",
    name: "Standard Profile",
    description: "Default potable water-quality limits for blended supply at plant inflow.",
    parameters: [
      { parameterId: "pH", label: "pH", unit: "pH", lowerLimit: 6.5, upperLimit: 8.5 },
      { parameterId: "alkalinity", label: "Alkalinity", unit: "mg/L CaCO3", lowerLimit: 50, upperLimit: 200 },
      { parameterId: "turbidity", label: "Turbidity", unit: "NTU", lowerLimit: 0, upperLimit: 5 },
    ],
  },
  {
    profileId: "QP-STRICT",
    name: "Strict Profile",
    description: "Tighter turbidity and alkalinity limits for sensitive supply conditions.",
    parameters: [
      { parameterId: "pH", label: "pH", unit: "pH", lowerLimit: 6.8, upperLimit: 8.0 },
      { parameterId: "alkalinity", label: "Alkalinity", unit: "mg/L CaCO3", lowerLimit: 60, upperLimit: 160 },
      { parameterId: "turbidity", label: "Turbidity", unit: "NTU", lowerLimit: 0, upperLimit: 2 },
    ],
  },
];

export const networkLinkRefs: NetworkLinkRef[] = [
  { linkId: "LINK-SP-01", kind: "source_to_plant", fromId: "SRC-BORE-01", fromName: "Northfield Borefield", toId: "PLANT-A", toName: "Northfield Treatment Plant", defaultCapacityMlPerDay: 40 },
  { linkId: "LINK-SP-02", kind: "source_to_plant", fromId: "SRC-RIV-03", fromName: "Coldwater River Intake", toId: "PLANT-A", toName: "Northfield Treatment Plant", defaultCapacityMlPerDay: 50 },
  { linkId: "LINK-SP-03", kind: "source_to_plant", fromId: "SRC-RES-02", fromName: "Highland Reservoir", toId: "PLANT-B", toName: "Central Treatment Plant", defaultCapacityMlPerDay: 58 },
  { linkId: "LINK-SP-04", kind: "source_to_plant", fromId: "SRC-DES-04", fromName: "Bayside Desalination", toId: "PLANT-B", toName: "Central Treatment Plant", defaultCapacityMlPerDay: 30 },
  { linkId: "LINK-SP-05", kind: "source_to_plant", fromId: "SRC-REC-05", fromName: "Eastvale Recycled Water", toId: "PLANT-A", toName: "Northfield Treatment Plant", defaultCapacityMlPerDay: 20 },
  { linkId: "LINK-SP-06", kind: "source_to_plant", fromId: "SRC-EMG-06", fromName: "Emergency Bore Reserve", toId: "PLANT-B", toName: "Central Treatment Plant", defaultCapacityMlPerDay: 15 },
  { linkId: "LINK-PZ-01", kind: "plant_to_zone", fromId: "PLANT-A", fromName: "Northfield Treatment Plant", toId: "ZONE-1", toName: "Zone 1 (CBD)", defaultCapacityMlPerDay: 60 },
  { linkId: "LINK-PZ-02", kind: "plant_to_zone", fromId: "PLANT-A", fromName: "Northfield Treatment Plant", toId: "ZONE-2", toName: "Zone 2 (Northern Suburbs)", defaultCapacityMlPerDay: 40 },
  { linkId: "LINK-PZ-03", kind: "plant_to_zone", fromId: "PLANT-B", fromName: "Central Treatment Plant", toId: "ZONE-2", toName: "Zone 2 (Northern Suburbs)", defaultCapacityMlPerDay: 40 },
  { linkId: "LINK-PZ-04", kind: "plant_to_zone", fromId: "PLANT-B", fromName: "Central Treatment Plant", toId: "ZONE-3", toName: "Zone 3 (Coastal)", defaultCapacityMlPerDay: 55 },
];
