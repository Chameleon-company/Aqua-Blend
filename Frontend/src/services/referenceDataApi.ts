import { getClient } from "./aquaBlendClient";
import type { DemandZoneRef, NetworkLinkRef, PlantRef, QualityProfile, SourceFilters, SourceRef } from "@/types/reference-data";

export function getSources(filters?: SourceFilters): Promise<SourceRef[]> {
  return getClient().getSources(filters);
}

export function getPlants(): Promise<PlantRef[]> {
  return getClient().getPlants();
}

export function getDemandZones(): Promise<DemandZoneRef[]> {
  return getClient().getDemandZones();
}

export function getNetworkLinks(): Promise<NetworkLinkRef[]> {
  return getClient().getNetworkLinks();
}

export function getQualityProfiles(): Promise<QualityProfile[]> {
  return getClient().getQualityProfiles();
}
