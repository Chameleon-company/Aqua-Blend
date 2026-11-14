import { Card, CardHeader } from "@/components/ui/Card";
import { MarkdownContent } from "@/components/ui/Markdown";

export interface AiExecutiveOverviewProps {
  executiveSummary: string | null;
  decisionExplanation: string | null;
}

/**
 * Priority order (Part 4/12): a populated `executiveSummary` wins; otherwise
 * fall back to `decisionExplanation` (the deterministic/LLM `display_explanation`
 * report, rendered as Markdown rather than one raw-text blob); only show the
 * "no summary" empty state when BOTH are unavailable — never alongside a
 * perfectly good report.
 */
export function AiExecutiveOverview({ executiveSummary, decisionExplanation }: AiExecutiveOverviewProps) {
  const summary = executiveSummary?.trim();
  const explanation = decisionExplanation?.trim();

  return (
    <Card>
      <CardHeader title="Executive Overview" />
      {summary ? (
        <MarkdownContent>{summary}</MarkdownContent>
      ) : explanation ? (
        <MarkdownContent>{explanation}</MarkdownContent>
      ) : (
        <p className="text-sm text-ink-muted">No analysis summary is available for this run.</p>
      )}
    </Card>
  );
}
