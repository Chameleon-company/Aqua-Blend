import { Card } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";

export interface RawAiOutputProps {
  data: unknown;
}

/**
 * Developer/debug affordance, not a headline section (Part 11) — collapsed
 * by default, monospace, scrollable both ways so a large payload never
 * breaks the page layout.
 */
export function RawAiOutput({ data }: RawAiOutputProps) {
  if (data === null || data === undefined) return null;

  return (
    <Card padding="sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">Technical Details</p>
      <Collapsible summary="View raw AI output">
        <pre className="max-h-96 overflow-auto whitespace-pre rounded-sm bg-surface-sunken p-3 font-mono text-xs text-ink">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Collapsible>
    </Card>
  );
}
