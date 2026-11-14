import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { RunAggregateDto, RunDto } from "@/types/run";
import type { MilpModelOutputDto } from "@/types/run";

vi.mock("next/navigation", () => ({
  useParams: () => ({ runId: "RUN-1002" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services/runApi", () => ({
  getRunAggregate: vi.fn(),
  createRun: vi.fn(),
}));

import { getRunAggregate } from "@/services/runApi";
import RunPage from "./page";

const mockedGetRunAggregate = vi.mocked(getRunAggregate);

function baseRun(overrides: Partial<RunDto> = {}): RunDto {
  return {
    runId: "RUN-1002",
    scenarioId: "SCN-001",
    scenarioName: "Test Scenario",
    status: "queued",
    solverOutcome: null,
    progressMessage: null,
    createdAt: "2026-01-01T00:00:00Z",
    solveTimeMs: null,
    objectiveValue: null,
    error: null,
    forceRerun: false,
    milpCacheHit: false,
    aiCacheHit: false,
    milpInputId: null,
    milpOutputId: null,
    aiOutputId: null,
    reusedMilpFromRunId: null,
    reusedAiFromRunId: null,
    milpStartedAt: null,
    milpCompletedAt: null,
    aiStartedAt: null,
    aiCompletedAt: null,
    ...overrides,
  };
}

function baseMilpOutput(overrides: Partial<MilpModelOutputDto> = {}): MilpModelOutputDto {
  return {
    id: "output-1",
    isLegacyFallback: false,
    schemaVersion: "1.0",
    scenarioExternalId: "SCN-001",
    scenarioStatus: "ready",
    executionKey: null,
    inputHash: null,
    modelParametersHash: null,
    milpModelVersion: null,
    solverName: "highs",
    solverVersion: null,
    solverConfigHash: null,
    solverTerminationCondition: "optimal",
    solverMessage: null,
    solveTimeMs: 120,
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
    solverStatus: "OPTIMAL",
    solverIsFeasible: true,
    solverIsOptimal: true,
    solverObjectiveValue: 1000,
    totalDemandMlPerDay: 100,
    totalWithdrawalMlPerDay: 100,
    totalTreatedMlPerDay: 100,
    totalDeliveredMlPerDay: 100,
    selectedSourceCount: 1,
    activePlantCount: 1,
    totalSourceFixedCost: 0,
    totalSourceVariableCost: 500,
    totalPlantFixedCost: 200,
    totalPlantVariableCost: 300,
    reconstructedTotalCost: 1000,
    totalCost: 1000,
    costReconciles: true,
    sources: [],
    plants: [],
    demandZones: [],
    flowsSourceToPlant: [],
    flowsPlantToZone: [],
    quality: [],
    bindingConstraintsSummary: [],
    warnings: [],
    ...overrides,
  };
}

function aggregate(overrides: Partial<RunAggregateDto> = {}): RunAggregateDto {
  return { run: baseRun(), scenario: null, input: null, milpOutput: null, aiOutput: null, ...overrides };
}

describe("RunPage (aggregate contract)", () => {
  it("renders a queued run safely with milpOutput/aiOutput both null", async () => {
    mockedGetRunAggregate.mockResolvedValue(aggregate({ run: baseRun({ status: "queued" }) }));
    render(<RunPage />);

    // "Queued" legitimately appears twice: the status pill and the waiting-state title.
    await waitFor(() => expect(screen.getAllByText("Queued").length).toBeGreaterThan(0));
    expect(screen.queryByText("Optimisation Summary")).not.toBeInTheDocument();
  });

  it("renders the MILP result immediately once milp_completed, without waiting for AI", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({ run: baseRun({ status: "milp_completed" }), milpOutput: baseMilpOutput() }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("Optimisation Summary")).toBeInTheDocument());
    expect(screen.getByText("AI analysis not started")).toBeInTheDocument();
  });

  it("keeps the MILP result visible for completed_with_ai_error and shows the AI failure separately", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({ run: baseRun({ status: "completed_with_ai_error" }), milpOutput: baseMilpOutput() }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("Optimisation Summary")).toBeInTheDocument());
    expect(screen.getByText("AI analysis could not be completed.")).toBeInTheDocument();
  });

  it("renders both MILP and AI output when completed", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({
        run: baseRun({ status: "completed" }),
        milpOutput: baseMilpOutput(),
        aiOutput: {
          id: "ai-1",
          status: "completed",
          aiProvider: null,
          aiModel: null,
          aiModelVersion: null,
          promptVersion: null,
          analysisVersion: null,
          aiContractVersion: "1.0",
          milpOutputHash: null,
          aiCacheKey: null,
          aiInputJson: {},
          executiveSummary: "All good.",
          decisionExplanation: null,
          keyFindings: [],
          anomalies: [],
          recommendations: [],
          warnings: [],
          riskAssessment: null,
          sourceAnalysis: null,
          plantAnalysis: null,
          qualityAnalysis: null,
          limitations: null,
          rawAiJson: {},
          aiOutputHash: null,
          cacheReusable: true,
          forcedRecompute: false,
          latencyMs: null,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          errorCode: null,
          errorMessage: null,
          createdAt: "2026-01-01T00:00:00Z",
          startedAt: null,
          completedAt: null,
          updatedAt: null,
        },
      }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("Optimisation Summary")).toBeInTheDocument());
    expect(screen.getByText("All good.")).toBeInTheDocument();
  });

  it("renders a mathematically infeasible MILP result as 'No feasible solution found', not a generic failure", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({
        run: baseRun({ status: "milp_completed" }),
        milpOutput: baseMilpOutput({ solverIsFeasible: false, solverIsOptimal: false }),
      }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("This scenario could not be solved")).toBeInTheDocument());
    expect(screen.queryByText("Optimisation Summary")).not.toBeInTheDocument();
  });

  it("renders a failed run safely using RunErrorState, without a milpOutput", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({ run: baseRun({ status: "failed", error: "The solver crashed." }) }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("The solver crashed.")).toBeInTheDocument());
  });

  it("renders a legacy run (input = null) without crashing, showing the legacy indicator", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({
        run: baseRun({ status: "completed" }),
        input: null,
        milpOutput: baseMilpOutput({ isLegacyFallback: true }),
      }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("No input snapshot available")).toBeInTheDocument());
    expect(screen.getByText("Legacy result")).toBeInTheDocument();
  });

  it("shows the cache-hit indicator when milpCacheHit is true, and forced-run metadata when forceRerun is true", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      aggregate({ run: baseRun({ status: "milp_completed", milpCacheHit: true, forceRerun: true }), milpOutput: baseMilpOutput() }),
    );
    render(<RunPage />);

    await waitFor(() => expect(screen.getByText("Optimisation result reused")).toBeInTheDocument());
    expect(screen.getByText("Forced re-run")).toBeInTheDocument();
  });
});
