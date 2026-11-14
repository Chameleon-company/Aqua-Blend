/**
 * AI analysis contract. Must remain visually and structurally separate from
 * the deterministic MilpResultViewModel — the MILP result is always the
 * source of truth, this is interpretation of it. Kept extensible for future
 * recommendations / trade-offs / resilience insights / scenario comparison.
 */

export type AIAnalysisStatus = "ready" | "pending" | "failed" | "unavailable";

export type AnomalySeverity = "info" | "warning" | "critical";

export interface Anomaly {
  id: string;
  message: string;
  severity: AnomalySeverity;
  relatedEntity?: string;
}

export interface AIAnalysisResult {
  runId: string;
  status: AIAnalysisStatus;
  summary: string | null;
  anomalies: Anomaly[];
  warnings?: string[];
  confidence?: string | number | null;
  estimatedDataDisclosure?: boolean;
  supportingEvidence?: string[];
}
