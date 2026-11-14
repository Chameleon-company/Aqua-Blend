import { getClient } from "./aquaBlendClient";
import type { AIAnalysisResult } from "@/types/ai-analysis";
import type { DiagnosticsResult } from "@/types/diagnostics";

export function getAIAnalysis(runId: string): Promise<AIAnalysisResult> {
  return getClient().getAIAnalysis(runId);
}

export function getDiagnostics(runId: string): Promise<DiagnosticsResult> {
  return getClient().getDiagnostics(runId);
}
