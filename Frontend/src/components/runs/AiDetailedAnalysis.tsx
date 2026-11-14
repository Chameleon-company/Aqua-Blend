import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { toTextList } from "@/utils/aiReport";
import type { MilpAiOutputDto } from "@/types/run";

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre rounded-sm bg-surface-sunken p-3 font-mono text-xs text-ink">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function TextBullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-ink-muted">
      {items.map((item, index) => (
        <li key={index} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export interface AiDetailedAnalysisProps {
  aiOutput: MilpAiOutputDto;
}

/**
 * Secondary detail, collapsed behind accordions (Part 10) — only sections
 * with actual content are rendered, and the whole card disappears rather
 * than showing empty panels when the AI worker hasn't populated any of
 * these fields (true for every real run today: main.py's save_ai_output
 * never sets riskAssessment/sourceAnalysis/plantAnalysis/qualityAnalysis/
 * recommendations/anomalies/limitations, so this legitimately renders
 * nothing until a future worker version populates them — Part 9).
 */
export function AiDetailedAnalysis({ aiOutput }: AiDetailedAnalysisProps) {
  const recommendations = toTextList(aiOutput.recommendations);
  const anomalies = toTextList(aiOutput.anomalies);
  const limitations = toTextList(aiOutput.limitations);

  const sections: Array<{ key: string; label: string; content: ReactNode }> = [];
  if (aiOutput.riskAssessment) sections.push({ key: "risk", label: "Risk Assessment", content: <JsonBlock data={aiOutput.riskAssessment} /> });
  if (aiOutput.sourceAnalysis) sections.push({ key: "source", label: "Source Analysis", content: <JsonBlock data={aiOutput.sourceAnalysis} /> });
  if (aiOutput.plantAnalysis) sections.push({ key: "plant", label: "Plant Analysis", content: <JsonBlock data={aiOutput.plantAnalysis} /> });
  if (aiOutput.qualityAnalysis)
    sections.push({ key: "quality", label: "Water Quality Analysis", content: <JsonBlock data={aiOutput.qualityAnalysis} /> });
  if (recommendations.length) sections.push({ key: "recommendations", label: "Recommendations", content: <TextBullets items={recommendations} /> });
  if (anomalies.length) sections.push({ key: "anomalies", label: "Anomalies", content: <TextBullets items={anomalies} /> });
  if (limitations.length) sections.push({ key: "limitations", label: "Limitations", content: <TextBullets items={limitations} /> });

  if (sections.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Detailed Analysis" description="Secondary detail behind the summary above." />
      <div className="flex flex-col">
        {sections.map((section) => (
          <Collapsible key={section.key} summary={section.label}>
            {section.content}
          </Collapsible>
        ))}
      </div>
    </Card>
  );
}
