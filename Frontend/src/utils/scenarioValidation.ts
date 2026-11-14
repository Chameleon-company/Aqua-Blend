/**
 * Frontend-only validation for immediate UX — points at the same
 * ValidationIssue shape the backend returns from `validateScenario()` so
 * `ValidationSummary` can render either without a different code path. The
 * backend remains authoritative; this only catches obvious problems before a
 * round trip.
 */
import type { ScenarioFormState, ValidationIssue } from "@/types/scenario";
import type { DemandZoneRef } from "@/types/reference-data";

export function validateScenarioFormState(form: ScenarioFormState, demandZoneRefs: DemandZoneRef[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!form.scenarioName.trim()) {
    issues.push({ message: "Scenario name is required.", field: "scenarioName", severity: "error" });
  }

  const enabledSources = form.sources.filter((s) => s.enabled && !s.forcedInactive);
  if (enabledSources.length === 0) {
    issues.push({ message: "At least one source must be enabled.", field: "sources", severity: "error" });
  }

  const enabledPlants = form.plants.filter((p) => p.enabled);
  if (enabledPlants.length === 0) {
    issues.push({ message: "At least one treatment plant must be enabled.", field: "plants", severity: "error" });
  }

  if (form.demandZones.length === 0) {
    issues.push({ message: "At least one demand zone is required.", field: "demandZones", severity: "error" });
  }
  for (const zone of form.demandZones) {
    const label = demandZoneRefs.find((z) => z.zoneId === zone.zoneId)?.name ?? zone.zoneId;
    if (zone.demandMlPerDay === null || zone.demandMlPerDay === undefined) {
      issues.push({ message: `${label} demand has not been entered.`, field: "demandZones", severity: "error" });
    } else if (zone.demandMlPerDay <= 0) {
      issues.push({ message: `${label} demand must be greater than zero.`, field: "demandZones", severity: "error" });
    }
  }

  if (!form.qualityProfileId) {
    issues.push({ message: "A water-quality profile must be selected.", field: "qualityProfileId", severity: "error" });
  }

  for (const s of form.sources) {
    if (
      s.minWithdrawalOverrideMlPerDay !== undefined &&
      s.maxWithdrawalOverrideMlPerDay !== undefined &&
      s.minWithdrawalOverrideMlPerDay > s.maxWithdrawalOverrideMlPerDay
    ) {
      issues.push({ message: "Minimum withdrawal override cannot exceed the maximum override.", field: "sources", severity: "error" });
    }
  }
  for (const p of form.plants) {
    if (
      p.minCapacityOverrideMlPerDay !== undefined &&
      p.maxCapacityOverrideMlPerDay !== undefined &&
      p.minCapacityOverrideMlPerDay > p.maxCapacityOverrideMlPerDay
    ) {
      issues.push({ message: "Minimum capacity override cannot exceed the maximum override.", field: "plants", severity: "error" });
    }
  }

  return issues;
}
