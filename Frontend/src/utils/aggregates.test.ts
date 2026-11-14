import { describe, expect, it } from "vitest";
import { computeSummaryMetrics } from "./aggregates";
import { mapMilpResultToViewModel } from "@/types/milp-results";
import { rawResultFixtures } from "@/services/mock/fixtures";

describe("computeSummaryMetrics", () => {
  it("sums real fields for an optimal result", () => {
    const metrics = computeSummaryMetrics(mapMilpResultToViewModel(rawResultFixtures["RUN-1001"]));
    expect(metrics.selectedSourceCount).toBe(4);
    expect(metrics.activePlantCount).toBe(2);
    expect(metrics.totalDemandMlPerDay).toBeCloseTo(128);
    expect(metrics.totalDeliveredMlPerDay).toBeCloseTo(127);
    expect(metrics.warningsCount).toBe(2);
  });

  it("never fabricates aggregates for an infeasible result with empty arrays", () => {
    const metrics = computeSummaryMetrics(mapMilpResultToViewModel(rawResultFixtures["RUN-1002"]));
    expect(metrics.totalDemandMlPerDay).toBeNull();
    expect(metrics.totalWithdrawalMlPerDay).toBeNull();
    expect(metrics.selectedSourceCount).toBe(0);
  });
});
