import { Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/states/EmptyState";
import { AiStatusStrip } from "./AiStatusStrip";
import { AiExecutiveOverview } from "./AiExecutiveOverview";
import { AiWarnings } from "./AiWarnings";
import { AiDetailedAnalysis } from "./AiDetailedAnalysis";
import { RawAiOutput } from "./RawAiOutput";
import { toTextList } from "@/utils/aiReport";
import type { MilpAiOutputDto, MilpModelOutputDto, RunWorkflowStatus } from "@/types/run";

export interface AiAnalysisSectionProps {
  status: string;
  aiOutput: MilpAiOutputDto | null;
  milpOutput?: MilpModelOutputDto | null;
}

/**
 * AI Analysis / "Analysis & Decision Support" section (AquaBlend_Frontend_
 * Final_Integration_Implementation.md §22). MILP output is always the
 * optimisation truth; this section only interprets it (Part 25) and must
 * render sensibly across every worker output shape it may see: deterministic
 * TEMPLATE_FALLBACK (the only mode the worker currently produces), a future
 * LLM_VALIDATED report, partial AI data, an AI failure, or no aiOutput yet.
 */
export function AiAnalysisSection({ status, aiOutput, milpOutput }: AiAnalysisSectionProps) {
  if (!aiOutput) {
    const s = status as RunWorkflowStatus;

    if (s === "ai_queued" || s === "ai_running") {
      return (
        <Card>
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-ink">{s === "ai_queued" ? "AI analysis queued" : "AI analysis in progress"}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {s === "ai_queued" ? "AI analysis will begin shortly." : "Analysing optimisation results…"} This does not affect the
                optimisation result above.
              </p>
            </div>
          </div>
        </Card>
      );
    }

    if (s === "completed_with_ai_error") {
      // Deliberately not the shared FailedState component here — its fixed
      // "Optimisation failed" kicker would misrepresent this run: the
      // optimisation succeeded, only the AI interpretation did not (Part 17).
      return (
        <Card className="border-l-2 border-l-warning">
          <p className="text-xs font-medium uppercase tracking-wide text-warning">Analysis warning</p>
          <h3 className="mt-1 text-base font-semibold text-ink">AI analysis could not be completed.</h3>
          <p className="mt-2 text-sm text-ink-muted">Optimisation completed successfully; only the AI interpretation failed.</p>
        </Card>
      );
    }

    if (s === "completed") {
      return <EmptyState title="No AI analysis available" description="This run completed without producing an AI analysis." />;
    }

    return <EmptyState title="AI analysis not started" description="AI analysis has not started for this run yet." />;
  }

  const keyFindings = toTextList(aiOutput.keyFindings);
  const warnings = toTextList(aiOutput.warnings);

  return (
    <div className="flex flex-col gap-6">
      <AiStatusStrip aiOutput={aiOutput} milpOutput={milpOutput ?? null} />

      <AiExecutiveOverview executiveSummary={aiOutput.executiveSummary} decisionExplanation={aiOutput.decisionExplanation} />

      {keyFindings.length > 0 ? (
        <Card>
          <CardHeader title="Key Findings" />
          <ul className="flex flex-col gap-2 text-sm text-ink">
            {keyFindings.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <AiWarnings warnings={warnings} />

      <AiDetailedAnalysis aiOutput={aiOutput} />

      <RawAiOutput data={aiOutput.rawAiJson} />
    </div>
  );
}
