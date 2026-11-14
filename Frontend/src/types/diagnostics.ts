/**
 * Infeasibility diagnostics contract. An infeasible MILP result is not a
 * frontend/system error — the frontend only displays backend-produced
 * diagnostic data, never infers infeasibility causes itself.
 */

export type DiagnosticsStatus = "ready" | "pending" | "failed" | "unavailable";

export interface DiagnosticFinding {
  id: string;
  description: string;
  affectedSources?: string[];
  affectedPlants?: string[];
  affectedLinks?: string[];
}

export interface DiagnosticsResult {
  runId: string;
  status: DiagnosticsStatus;
  summary: string | null;
  likelyCauses: string[];
  findings: DiagnosticFinding[];
  suggestedInvestigation?: string[];
}
