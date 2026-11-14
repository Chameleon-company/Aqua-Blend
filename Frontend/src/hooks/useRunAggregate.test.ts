import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRunAggregate } from "./useRunAggregate";
import type { RunAggregateDto } from "@/types/run";

vi.mock("@/services/runApi", () => ({
  getRunAggregate: vi.fn(),
}));

import { getRunAggregate } from "@/services/runApi";

const mockedGetRunAggregate = vi.mocked(getRunAggregate);

function makeAggregate(status: string): RunAggregateDto {
  return {
    run: {
      runId: "RUN-1",
      scenarioId: "SCN-1",
      scenarioName: null,
      status,
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
    },
    scenario: null,
    input: null,
    milpOutput: null,
    aiOutput: null,
  };
}

describe("useRunAggregate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedGetRunAggregate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops polling once the run reaches a terminal status (§12/§37)", async () => {
    mockedGetRunAggregate
      .mockResolvedValueOnce(makeAggregate("queued"))
      .mockResolvedValueOnce(makeAggregate("milp_running"))
      .mockResolvedValue(makeAggregate("completed"));

    const { result } = renderHook(() => useRunAggregate("RUN-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data?.run.status).toBe("queued");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.data?.run.status).toBe("milp_running");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.data?.run.status).toBe("completed");

    const callsAtCompletion = mockedGetRunAggregate.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(mockedGetRunAggregate.mock.calls.length).toBe(callsAtCompletion);
  });

  it("keeps polling through milp_completed since AI analysis may still be pending", async () => {
    mockedGetRunAggregate.mockResolvedValue(makeAggregate("milp_completed"));

    renderHook(() => useRunAggregate("RUN-1"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const callsAfterFirst = mockedGetRunAggregate.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockedGetRunAggregate.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it("does not overlap requests: only one fetch is in flight at a time", async () => {
    let resolveFirst: (() => void) | undefined;
    const firstCallPromise = new Promise<RunAggregateDto>((resolve) => {
      resolveFirst = () => resolve(makeAggregate("queued"));
    });
    mockedGetRunAggregate.mockReturnValueOnce(firstCallPromise);

    renderHook(() => useRunAggregate("RUN-1"));

    // Advance well past the poll interval while the first request is still pending.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(mockedGetRunAggregate.mock.calls.length).toBe(1);

    mockedGetRunAggregate.mockResolvedValue(makeAggregate("completed"));
    await act(async () => {
      resolveFirst?.();
      await vi.advanceTimersByTimeAsync(0);
    });
  });
});
