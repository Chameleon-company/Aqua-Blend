import { getClient } from "./aquaBlendClient";
import type { StressTestConfig, StressTestResult, StressTestSummary } from "@/types/stress-test";

export function createStressTest(runId: string, config: StressTestConfig): Promise<StressTestSummary> {
  return getClient().createStressTest(runId, config);
}

export function getRunStressTests(runId: string): Promise<StressTestSummary[]> {
  return getClient().getRunStressTests(runId);
}

export function getStressTest(stressTestId: string): Promise<StressTestResult> {
  return getClient().getStressTest(stressTestId);
}
