import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MilpResultSummary } from "./MilpResultSummary";
import { MilpCostBreakdown } from "./MilpCostBreakdown";
import type { MilpModelOutputDto } from "@/types/run";

/** A fully-null MilpModelOutputDto, as the backend legitimately returns for
 *  an infeasible or not-yet-fully-populated result — every numeric/boolean
 *  field is null except the required non-null ones. */
const NULL_OUTPUT: MilpModelOutputDto = {
  id: "output-1",
  isLegacyFallback: false,
  schemaVersion: null,
  scenarioExternalId: null,
  scenarioStatus: null,
  executionKey: null,
  inputHash: null,
  modelParametersHash: null,
  milpModelVersion: null,
  solverName: null,
  solverVersion: null,
  solverConfigHash: null,
  solverTerminationCondition: null,
  solverMessage: null,
  solveTimeMs: null,
  rawOutputJson: {},
  outputHash: null,
  cacheReusable: true,
  forcedRecompute: false,
  startedAt: null,
  completedAt: null,
  updatedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  loaderStatus: null,
  loaderScenarioReady: null,
  loaderValidationIssues: null,
  loaderChecks: null,
  preprocessingStatus: null,
  preprocessingWarnings: null,
  preprocessingChecks: null,
  outputConsistencyStatus: null,
  outputConsistencyTolerance: null,
  outputConsistencyChecks: null,
  solverStatus: null,
  solverIsFeasible: null,
  solverIsOptimal: null,
  solverObjectiveValue: null,
  totalDemandMlPerDay: null,
  totalWithdrawalMlPerDay: null,
  totalTreatedMlPerDay: null,
  totalDeliveredMlPerDay: null,
  selectedSourceCount: null,
  activePlantCount: null,
  totalSourceFixedCost: null,
  totalSourceVariableCost: null,
  totalPlantFixedCost: null,
  totalPlantVariableCost: null,
  reconstructedTotalCost: null,
  totalCost: null,
  costReconciles: null,
  sources: null,
  plants: null,
  demandZones: null,
  flowsSourceToPlant: null,
  flowsPlantToZone: null,
  quality: null,
  bindingConstraintsSummary: null,
  warnings: null,
};

describe("MilpResultSummary with an all-null output", () => {
  it("never renders NaN, undefined, or $undefined", () => {
    const { container } = render(<MilpResultSummary output={NULL_OUTPUT} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/undefined/i);
    expect(text).not.toMatch(/\$undefined/);
  });

  it("shows 'Not available' (MISSING_VALUE) instead of 0 for missing costs", () => {
    const { getAllByText } = render(<MilpResultSummary output={NULL_OUTPUT} />);
    expect(getAllByText("N/A").length).toBeGreaterThan(0);
  });
});

describe("MilpCostBreakdown with an all-null output", () => {
  it("never renders NaN/undefined and never fabricates $0 for missing costs", () => {
    const { container } = render(<MilpCostBreakdown output={NULL_OUTPUT} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/undefined/i);
    expect(text).not.toMatch(/\$0\.00/);
  });
});
