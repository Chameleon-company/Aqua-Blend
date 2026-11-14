"use client";

import { Sparkles, Lightbulb, ShieldAlert, AlertTriangle } from "lucide-react";
import { useAnalysisContext } from "../layout";
import { LocalSubNav, type LocalSubNavItem } from "@/components/layout/LocalSubNav";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { MarkdownContent } from "@/components/ui/Markdown";
import { AnomalyList } from "@/components/ai/AnomalyList";
import { AnomalySeverityBreakdown } from "@/components/analysis/AnomalySeverityBreakdown";
import { SummarySkeleton } from "@/components/states/Skeleton";
import { AI_ANALYSIS_STATE_META } from "@/utils/resultStatus";

export default function AiAnalysisPage() {
  const { results, aiPhase, aiAnalysis } = useAnalysisContext();
  const isInfeasible = results.solverStatus.toLowerCase() === "infeasible";

  const status = aiAnalysis?.status ?? (aiPhase === "loading" ? "pending" : aiPhase === "ready" ? "ready" : aiPhase === "failed" ? "failed" : "pending");
  const meta = AI_ANALYSIS_STATE_META[status];
  const isPending = aiPhase === "loading" || aiPhase === "idle";
  const isUnavailable = aiPhase === "failed" || status === "failed" || status === "unavailable";

  const hasFindings = Boolean(aiAnalysis?.supportingEvidence && aiAnalysis.supportingEvidence.length > 0);
  const summaryTitle = isInfeasible ? "Infeasibility Explanation" : "Executive Summary";

  const sections: LocalSubNavItem[] = [
    { id: "summary", label: isInfeasible ? "Explanation" : "Summary" },
    ...(hasFindings ? [{ id: "findings", label: "Findings" }] : []),
    { id: "anomalies", label: "Anomalies" },
    { id: "warnings", label: "Warnings" },
  ];

  if (isPending) {
    return (
      <Card>
        <CardHeader title={summaryTitle} icon={<Sparkles className="h-4 w-4" />} />
        <p className="mb-4 text-sm text-ink-muted">Waiting for the AI analysis to be generated…</p>
        <SummarySkeleton />
      </Card>
    );
  }

  if (isUnavailable) {
    return (
      <Card>
        <CardHeader title={summaryTitle} icon={<Sparkles className="h-4 w-4" />} action={<StatusPill label={meta.label} tone={meta.tone} />} />
        <p className="text-sm text-ink-muted">{aiAnalysis?.warnings?.[0] ?? "The AI analysis could not be generated for this run. MILP results above remain the authoritative source of truth."}</p>
      </Card>
    );
  }

  return (
    <div>
      <LocalSubNav items={sections} />

      <section id="summary" className="scroll-mt-32">
        <Card>
          <CardHeader
            title={summaryTitle}
            description="Interpretation of the MILP result above — it does not influence the optimisation decision."
            icon={<Sparkles className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-2">
                {aiAnalysis?.confidence != null ? <span className="text-xs text-ink-faint">Confidence: {aiAnalysis.confidence}</span> : null}
                <StatusPill label={meta.label} tone={meta.tone} />
              </div>
            }
          />
          {aiAnalysis?.summary ? (
            <MarkdownContent>{aiAnalysis.summary}</MarkdownContent>
          ) : (
            <p className="text-sm text-ink-muted">No summary was returned for this run.</p>
          )}
          {aiAnalysis?.estimatedDataDisclosure ? (
            <p className="mt-4 text-xs text-warning">This analysis references source data that is estimated, not measured.</p>
          ) : null}
        </Card>
      </section>

      {hasFindings ? (
        <section id="findings" className="scroll-mt-32 mt-6">
          <Card>
            <CardHeader title="Key Findings" icon={<Lightbulb className="h-4 w-4" />} />
            <ul className="flex flex-col gap-2 text-sm text-ink">
              {aiAnalysis!.supportingEvidence!.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section id="anomalies" className="scroll-mt-32 mt-6">
        <Card>
          <CardHeader title="Anomalies" icon={<AlertTriangle className="h-4 w-4" />} action={<AnomalySeverityBreakdown anomalies={aiAnalysis?.anomalies ?? []} />} />
          <AnomalyList anomalies={aiAnalysis?.anomalies ?? []} />
        </Card>
      </section>

      <section id="warnings" className="scroll-mt-32 mt-6">
        <Card>
          <CardHeader title="Warnings" icon={<ShieldAlert className="h-4 w-4" />} />
          {aiAnalysis?.warnings && aiAnalysis.warnings.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-sm text-ink">
              {aiAnalysis.warnings.map((warning) => (
                <li key={warning} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No warnings were raised for this run.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
