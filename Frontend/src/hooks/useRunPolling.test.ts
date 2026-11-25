/**
 * Task 59: Verify optimisation run submission and status tracking.
 *
 * Covers the run-tracking half of the workflow in hooks/useRunPolling.ts:
 *   - the hook tracks the run ID it was given and exposes the backend status
 *   - queued and in-progress states are shown while polling continues
 *   - completed, completed_with_ai_error, infeasible and failed runs are handled
 *   - polling stops once the run reaches a terminal workflow status
 *
 * Run creation (POST /api/scenarios/{id}/runs returning a run ID) is covered
 * separately in Backend/AquaBlend.Tests/RunCreationAndAggregateTests.cs.
 *
 * The result/AI adapters and the diagnostics API are mocked so these tests
 * check the hook's tracking logic only, not the shape of MILP or AI output.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRunPolling } from "./useRunPolling";
import type { MilpModelOutputDto, RunAggregateDto } from "@/types/run";

vi.mock("@/services/runApi", () => ({
  getRunAggregate: vi.fn(),
}));

vi.mock("@/services/analysisApi", () => ({
  getDiagnostics: vi.fn(),
}));

vi.mock("@/utils/runResultAdapters", () => ({
  mapMilpOutputToViewModel: vi.fn(() => ({ mapped: "milp" })),
  mapAiOutputToAiAnalysisResult: vi.fn(() => ({ mapped: "ai" })),
}));

import { getRunAggregate } from "@/services/runApi";
import { getDiagnostics } from "@/services/analysisApi";

const mockedGetRunAggregate = vi.mocked(getRunAggregate);
const mockedGetDiagnostics = vi.mocked(getDiagnostics);

const RUN_ID = "RUN-1001";
const POLL_INTERVAL_MS = 3000;

function makeAggregate(
  status: string,
  options: { milpOutput?: Partial<MilpModelOutputDto> | null; error?: string | null } = {},
): RunAggregateDto {
  return {
    run: {
      runId: RUN_ID,
      scenarioId: "SCN-1",
      scenarioName: "Test scenario",
      status,
      solverOutcome: null,
      progressMessage: null,
      createdAt: "2026-11-25T00:00:00Z",
      solveTimeMs: null,
      objectiveValue: null,
      error: options.error ?? null,
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
    },
    scenario: null,
    input: null,
    milpOutput: (options.milpOutput as MilpModelOutputDto | null | undefined) ?? null,
    aiOutput: null,
  };
}

/** Lets the initial poll (fired synchronously on mount) resolve. */
async function flushFirstPoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advancePolls(count: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * count);
  });
}

describe("useRunPolling (Task 59: run status tracking)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedGetRunAggregate.mockReset();
    mockedGetDiagnostics.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests the run it was given and exposes its run ID and status", async () => {
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("queued"));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    expect(result.current.loading).toBe(true);

    await flushFirstPoll();

    expect(mockedGetRunAggregate).toHaveBeenCalledWith(RUN_ID);
    expect(result.current.loading).toBe(false);
    expect(result.current.run?.runId).toBe(RUN_ID);
    expect(result.current.run?.status).toBe("queued");
  });

  it("shows queued and running states as the run progresses", async () => {
    mockedGetRunAggregate
      .mockResolvedValueOnce(makeAggregate("queued"))
      .mockResolvedValueOnce(makeAggregate("preparing_input"))
      .mockResolvedValueOnce(makeAggregate("milp_running"))
      .mockResolvedValue(makeAggregate("ai_running"));

    const { result } = renderHook(() => useRunPolling(RUN_ID));

    await flushFirstPoll();
    expect(result.current.run?.status).toBe("queued");

    await advancePolls(1);
    expect(result.current.run?.status).toBe("preparing_input");

    await advancePolls(1);
    expect(result.current.run?.status).toBe("milp_running");

    await advancePolls(1);
    expect(result.current.run?.status).toBe("ai_running");

    // No terminal data is built while the run is still in progress.
    expect(result.current.resultsPhase).toBe("idle");
    expect(result.current.aiPhase).toBe("idle");
  });

  it("keeps polling through milp_completed because AI analysis may still be pending", async () => {
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("milp_completed", { milpOutput: { solverIsFeasible: true } }));

    renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();
    const callsAfterFirst = mockedGetRunAggregate.mock.calls.length;

    await advancePolls(2);
    expect(mockedGetRunAggregate.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("handles a completed run: stops polling and loads results and AI analysis", async () => {
    mockedGetRunAggregate
      .mockResolvedValueOnce(makeAggregate("milp_running"))
      .mockResolvedValue(makeAggregate("completed", { milpOutput: { solverIsFeasible: true } }));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();
    await advancePolls(1);

    expect(result.current.run?.status).toBe("completed");
    expect(result.current.resultsPhase).toBe("ready");
    expect(result.current.results).toEqual({ mapped: "milp" });
    expect(result.current.aiPhase).toBe("ready");
    expect(result.current.diagnosticsPhase).toBe("idle");
    expect(mockedGetDiagnostics).not.toHaveBeenCalled();

    const callsAtCompletion = mockedGetRunAggregate.mock.calls.length;
    await advancePolls(5);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtCompletion);
  });

  it("treats completed_with_ai_error as terminal and still shows the MILP results", async () => {
    mockedGetRunAggregate.mockResolvedValue(
      makeAggregate("completed_with_ai_error", { milpOutput: { solverIsFeasible: true } }),
    );

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();

    expect(result.current.resultsPhase).toBe("ready");
    const callsAtCompletion = mockedGetRunAggregate.mock.calls.length;
    await advancePolls(5);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtCompletion);
  });

  it("handles an infeasible run: stops polling and requests diagnostics", async () => {
    // The real backend has no "infeasible" workflow status. An infeasible run
    // finishes as "completed" and is identified by milpOutput.solverIsFeasible === false.
    mockedGetDiagnostics.mockResolvedValue({ mapped: "diagnostics" } as never);
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("completed", { milpOutput: { solverIsFeasible: false } }));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();

    expect(mockedGetDiagnostics).toHaveBeenCalledWith(RUN_ID);
    expect(result.current.diagnosticsPhase).toBe("ready");
    expect(result.current.diagnostics).toEqual({ mapped: "diagnostics" });

    const callsAtCompletion = mockedGetRunAggregate.mock.calls.length;
    await advancePolls(5);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtCompletion);
  });

  it("shows a diagnostics error for an infeasible run when diagnostics are unavailable", async () => {
    // GET /api/runs/{id}/diagnostics currently returns DIAGNOSTICS_NOT_IMPLEMENTED.
    mockedGetDiagnostics.mockRejectedValue(new Error("Infeasibility diagnostics are not implemented yet."));
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("completed", { milpOutput: { solverIsFeasible: false } }));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();

    expect(result.current.diagnosticsPhase).toBe("failed");
    expect(result.current.diagnosticsError).toBeDefined();
    // The MILP results are still shown even though diagnostics failed.
    expect(result.current.resultsPhase).toBe("ready");
  });

  it("handles a failed run: stops polling, exposes the error and builds no results", async () => {
    mockedGetRunAggregate
      .mockResolvedValueOnce(makeAggregate("milp_running"))
      .mockResolvedValue(makeAggregate("failed", { error: "Solver crashed" }));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();
    await advancePolls(1);

    expect(result.current.run?.status).toBe("failed");
    expect(result.current.run?.error).toBe("Solver crashed");
    expect(result.current.resultsPhase).toBe("idle");
    expect(result.current.aiPhase).toBe("idle");
    expect(mockedGetDiagnostics).not.toHaveBeenCalled();

    const callsAtFailure = mockedGetRunAggregate.mock.calls.length;
    await advancePolls(5);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtFailure);
  });

  it("reports a completed run with no MILP output as a results error", async () => {
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("completed", { milpOutput: null }));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();

    expect(result.current.resultsPhase).toBe("failed");
    expect(result.current.resultsError).toBeDefined();
  });

  it("stops polling and shows an error when the status request fails", async () => {
    mockedGetRunAggregate.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeDefined();

    const callsAtError = mockedGetRunAggregate.mock.calls.length;
    await advancePolls(5);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtError);
  });

  it("stops polling when the page is closed (component unmounts)", async () => {
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("milp_running"));

    const { unmount } = renderHook(() => useRunPolling(RUN_ID));
    await flushFirstPoll();
    unmount();

    const callsAtUnmount = mockedGetRunAggregate.mock.calls.length;
    await advancePolls(5);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtUnmount);
  });

  // KNOWN ISSUE (see Task 59 findings): useRunPolling uses setInterval, so a
  // slow request can still be in flight when the next poll fires. These tests
  // describe the intended behaviour and are marked `it.fails` until the hook
  // is changed to chained setTimeout, as hooks/useRunAggregate.ts already does.
  // Once fixed, remove `.fails` and they should pass.
  it("does not start a new request while the previous one is still in flight", async () => {
    let resolveFirst: ((value: RunAggregateDto) => void) | undefined;
    mockedGetRunAggregate.mockReturnValueOnce(
      new Promise<RunAggregateDto>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("milp_running"));

    renderHook(() => useRunPolling(RUN_ID));

    // The first request is still pending after three poll intervals.
    await advancePolls(3);
    expect(mockedGetRunAggregate.mock.calls.length).toBe(1);

    await act(async () => {
      resolveFirst?.(makeAggregate("queued"));
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  it("does not leave a finished run showing an out-of-date status after a slow response", async () => {
    let resolveSlow: ((value: RunAggregateDto) => void) | undefined;
    mockedGetRunAggregate
      // The first request (on mount) is slow and comes back with an older status.
      .mockReturnValueOnce(
        new Promise<RunAggregateDto>((resolve) => {
          resolveSlow = resolve;
        }),
      )
      // Every later request returns the terminal status.
      .mockResolvedValue(makeAggregate("completed", { milpOutput: { solverIsFeasible: true } }));

    const { result } = renderHook(() => useRunPolling(RUN_ID));
    await advancePolls(1);

    // The slow first response finally arrives with an out-of-date status.
    await act(async () => {
      resolveSlow?.(makeAggregate("milp_running"));
      await vi.advanceTimersByTimeAsync(0);
    });
    await advancePolls(2);

    // The user must end up seeing the run's real, finished status.
    expect(result.current.run?.status).toBe("completed");
    expect(result.current.resultsPhase).toBe("ready");
  });
});
