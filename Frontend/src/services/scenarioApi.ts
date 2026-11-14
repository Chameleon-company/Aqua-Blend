import { getClient } from "./aquaBlendClient";
import type { ScenarioDetail, ScenarioFormState, ScenarioSummary, ValidationResult } from "@/types/scenario";

export function getScenarios(): Promise<ScenarioSummary[]> {
  return getClient().getScenarios();
}

export function getScenario(scenarioId: string): Promise<ScenarioDetail> {
  return getClient().getScenario(scenarioId);
}

export function createScenario(form: ScenarioFormState): Promise<ScenarioDetail> {
  return getClient().createScenario(form);
}

export function updateScenario(scenarioId: string, form: ScenarioFormState): Promise<ScenarioDetail> {
  return getClient().updateScenario(scenarioId, form);
}

export function deleteScenario(scenarioId: string): Promise<void> {
  return getClient().deleteScenario(scenarioId);
}

export function validateScenario(scenarioId: string): Promise<ValidationResult> {
  return getClient().validateScenario(scenarioId);
}
