import { describe, expect, it } from "vitest";
import { getRunProgressInfo, getRunStatusMeta, RUN_WORKFLOW_STATUS_META } from "./resultStatus";
import { RUN_WORKFLOW_STATUSES } from "@/types/run";

describe("getRunStatusMeta", () => {
  it("resolves every real backend workflow status to a distinct, non-crashing label", () => {
    for (const status of RUN_WORKFLOW_STATUSES) {
      const meta = getRunStatusMeta(status);
      expect(meta.label).toBeTruthy();
      expect(["neutral", "info", "success", "warning", "danger"]).toContain(meta.tone);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(getRunStatusMeta("  QUEUED  ").label).toBe(getRunStatusMeta("queued").label);
  });

  it("falls back to a neutral pill for an unrecognised status instead of throwing", () => {
    expect(() => getRunStatusMeta("some_future_status")).not.toThrow();
    const meta = getRunStatusMeta("some_future_status");
    expect(meta.tone).toBe("neutral");
    expect(meta.label).toBe("some_future_status");
  });

  it("never throws for null/undefined/empty status", () => {
    expect(() => getRunStatusMeta(null)).not.toThrow();
    expect(() => getRunStatusMeta(undefined)).not.toThrow();
    expect(() => getRunStatusMeta("")).not.toThrow();
    expect(getRunStatusMeta(null).label).toBe("Unknown");
  });

  it("still resolves the mock adapter's legacy pipeline stages (backward compatibility)", () => {
    expect(getRunStatusMeta("solving").tone).toBe("info");
    expect(getRunStatusMeta("infeasible").tone).toBe("warning");
  });

  it("milp_completed is not success-toned (AI analysis may still be pending)", () => {
    expect(getRunStatusMeta("milp_completed").tone).not.toBe("success");
  });
});

describe("RUN_WORKFLOW_STATUS_META", () => {
  it("has exactly one entry per canonical backend workflow status", () => {
    expect(RUN_WORKFLOW_STATUSES).toHaveLength(9);
    expect(Object.keys(RUN_WORKFLOW_STATUS_META).sort()).toEqual([...RUN_WORKFLOW_STATUSES].sort());
  });
});

describe("getRunProgressInfo (run-progress stepper mapping)", () => {
  it("maps queued to the Queued stage (index 0)", () => {
    expect(getRunProgressInfo("queued")).toMatchObject({ recognised: true, stageIndex: 0, isFailed: false, isAiWarning: false });
  });

  it("maps preparing_input to the Preparing stage (index 1)", () => {
    expect(getRunProgressInfo("preparing_input").stageIndex).toBe(1);
  });

  it("maps milp_running to the Optimising stage (index 2)", () => {
    expect(getRunProgressInfo("milp_running").stageIndex).toBe(2);
  });

  it("marks optimisation complete at milp_completed (advances to the Analysing stage)", () => {
    const info = getRunProgressInfo("milp_completed");
    expect(info.stageIndex).toBe(3);
    expect(info.sentence).toMatch(/preparing analysis/i);
  });

  it("maps ai_queued to the Analysing stage", () => {
    expect(getRunProgressInfo("ai_queued").stageIndex).toBe(3);
  });

  it("maps ai_running to the Analysing stage", () => {
    expect(getRunProgressInfo("ai_running").stageIndex).toBe(3);
  });

  it("marks every stage complete at completed", () => {
    const info = getRunProgressInfo("completed");
    expect(info.stageIndex).toBe(4);
    expect(info.isFailed).toBe(false);
    expect(info.isAiWarning).toBe(false);
  });

  it("preserves completed optimisation and flags an analysis warning for completed_with_ai_error", () => {
    const info = getRunProgressInfo("completed_with_ai_error");
    expect(info.stageIndex).toBe(4);
    expect(info.isAiWarning).toBe(true);
    expect(info.isFailed).toBe(false);
  });

  it("marks failed without crashing, and uses milp timestamps to place the failure point", () => {
    expect(() => getRunProgressInfo("failed")).not.toThrow();
    expect(getRunProgressInfo("failed").isFailed).toBe(true);
    expect(getRunProgressInfo("failed", {}).stageIndex).toBe(1);
    expect(getRunProgressInfo("failed", { milpStartedAt: "2026-01-01T00:00:00Z" }).stageIndex).toBe(2);
    expect(getRunProgressInfo("failed", { milpStartedAt: "x", milpCompletedAt: "y" }).stageIndex).toBe(3);
  });

  it("never throws and reports recognised:false for an unrecognised future status", () => {
    expect(() => getRunProgressInfo("some_future_status")).not.toThrow();
    expect(getRunProgressInfo("some_future_status").recognised).toBe(false);
  });

  it("never throws for null/undefined status", () => {
    expect(() => getRunProgressInfo(null)).not.toThrow();
    expect(() => getRunProgressInfo(undefined)).not.toThrow();
    expect(getRunProgressInfo(null).recognised).toBe(false);
  });
});
