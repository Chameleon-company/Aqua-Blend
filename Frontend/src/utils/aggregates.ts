/**
 * Simple, honest aggregations over the MILP results view model. Every
 * aggregate here is a plain sum of fields the view model already guarantees;
 * anything based on an optional field returns `null` (not 0) unless every
 * contributing row supplies it — never fabricate a derived value that isn't
 * safely calculable from the mapped result.
 */
import type { MilpResultViewModel } from "@/types/milp-results";

export interface SummaryMetrics {
  totalCost: number | null;
  totalDemandMlPerDay: number | null;
  totalDeliveredMlPerDay: number | null;
  totalWithdrawalMlPerDay: number | null;
  totalThroughputMlPerDay: number | null;
  unmetDemandMlPerDay: number | null;
  selectedSourceCount: number;
  activePlantCount: number;
  warningsCount: number;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function computeSummaryMetrics(result: MilpResultViewModel): SummaryMetrics {
  const zones = result.demandZones;
  const plants = result.plants;
  const selectedSources = result.selectedSources;

  const allZonesHaveUnmet = zones.length > 0 && zones.every((z) => typeof z.unmetDemandMlPerDay === "number");

  return {
    totalCost: result.costBreakdown?.reconstructedTotalCost ?? result.objectiveValue ?? null,
    totalDemandMlPerDay: zones.length > 0 ? sum(zones.map((z) => z.demandMlPerDay)) : null,
    totalDeliveredMlPerDay: zones.length > 0 ? sum(zones.map((z) => z.deliveredMlPerDay)) : null,
    totalWithdrawalMlPerDay: selectedSources.length > 0 ? sum(selectedSources.map((s) => s.withdrawalMlPerDay)) : null,
    totalThroughputMlPerDay: plants.length > 0 ? sum(plants.map((p) => p.throughputMlPerDay)) : null,
    unmetDemandMlPerDay: allZonesHaveUnmet ? sum(zones.map((z) => z.unmetDemandMlPerDay ?? 0)) : null,
    selectedSourceCount: selectedSources.length,
    activePlantCount: plants.filter((p) => p.isActive).length,
    warningsCount: result.warnings.length,
  };
}
