import type { StressTestResult } from "@/types/stress-test";

/** Seed stress tests so the stress-testing page has content before the user runs one. */
export const stressTestFixtures: StressTestResult[] = [
  {
    stressTestId: "STRESS-0001",
    runId: "RUN-1001",
    config: { kind: "increase_demand", targetId: "ZONE-1", variationPercent: 15 },
    status: "completed",
    feasible: true,
    objectiveChangePercent: 6.2,
    createdAt: "2026-08-23T09:00:00Z",
  },
  {
    stressTestId: "STRESS-0002",
    runId: "RUN-1001",
    config: { kind: "disable_source", targetId: "SRC-RES-02" },
    status: "completed",
    feasible: false,
    criticalConstraint: "Zone 1 demand (hard constraint)",
    createdAt: "2026-08-23T09:05:00Z",
  },
];
