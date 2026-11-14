/**
 * Stress-testing contracts. The frontend only configures tests against an
 * already-completed run; the backend executes them.
 */

export type StressTestKind =
  | "increase_demand"
  | "reduce_plant_capacity"
  | "disable_source"
  | "reduce_link_capacity"
  | "stricter_quality_limits";

export interface StressTestConfig {
  kind: StressTestKind;
  targetId?: string;
  variationPercent?: number;
  parameterId?: string;
}

export type StressTestState = "queued" | "running" | "completed" | "failed";

export interface StressTestSummary {
  stressTestId: string;
  runId: string;
  kind: StressTestKind;
  status: StressTestState;
  createdAt: string;
}

export interface StressTestResult {
  stressTestId: string;
  runId: string;
  config: StressTestConfig;
  status: StressTestState;
  feasible?: boolean;
  objectiveChangePercent?: number;
  criticalConstraint?: string;
  createdAt: string;
}
