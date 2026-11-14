import { getClient } from "./aquaBlendClient";
import type { CreateRunRequestDto, CreateRunResponse, Run, RunAggregateDto, RunSummary } from "@/types/run";
import type { MilpResultViewModel } from "@/types/milp-results";

/** `request` defaults to `{ forceRerun: false }` when omitted — see ScenarioDetailPage's "Force full re-run" action for the true case. */
export function createRun(scenarioId: string, request?: CreateRunRequestDto): Promise<CreateRunResponse> {
  return getClient().createRun(scenarioId, request);
}

export function getScenarioRuns(scenarioId: string): Promise<RunSummary[]> {
  return getClient().getScenarioRuns(scenarioId);
}

/** @deprecated superseded by getRunAggregate — kept for the legacy /results/* pages only. */
export function getRun(runId: string): Promise<Run> {
  return getClient().getRun(runId);
}

export function getResults(runId: string): Promise<MilpResultViewModel> {
  return getClient().getResults(runId);
}

/** GET /api/runs/{runId} — run + scenario + input + milpOutput + aiOutput in one call. */
export function getRunAggregate(runId: string): Promise<RunAggregateDto> {
  return getClient().getRunAggregate(runId);
}
