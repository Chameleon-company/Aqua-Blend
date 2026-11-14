/**
 * Frontend-only error presentation model — points.md §19.
 * This does not prescribe backend error codes; it is how the UI normalises
 * whatever the upstream service throws into something a user can act on.
 */

export type FrontendErrorCategory =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORISED"
  | "FORBIDDEN"
  | "SCENARIO_VALIDATION_FAILED"
  | "RUN_CREATION_FAILED"
  | "OPTIMISATION_INFEASIBLE"
  | "OPTIMISATION_FAILED"
  | "AI_ANALYSIS_FAILED"
  | "DIAGNOSTICS_FAILED"
  | "STRESS_TEST_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface AppError {
  category: FrontendErrorCategory;
  message: string;
  cause?: unknown;
}
