import { Card, CardHeader } from "@/components/ui/Card";
import { asArray, asRecord, pickString } from "@/utils/jsonAccess";
import type { MilpModelOutputDto } from "@/types/run";

export interface MilpBindingConstraintsProps {
  output: MilpModelOutputDto;
}

function toLabel(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  const r = asRecord(raw);
  return pickString(r, "message", "label", "description");
}

/**
 * Binding Constraints and Warnings (AquaBlend_Frontend_Final_Integration_
 * Implementation.md §20) — rendered as two separate sections. Supports `[]`,
 * `null`, and unexpected-but-valid shapes (a bare string, or an object with a
 * message-like field) without crashing.
 */
export function MilpBindingConstraints({ output }: MilpBindingConstraintsProps) {
  const constraints = asArray(output.bindingConstraintsSummary).map(toLabel).filter((v): v is string => v !== null);
  const warnings = asArray(output.warnings).map(toLabel).filter((v): v is string => v !== null);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Binding Constraints" />
        {constraints.length === 0 ? (
          <p className="text-sm text-ink-muted">No binding constraints were reported for this run.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm text-ink">
            {constraints.map((label, index) => (
              <li key={index} className="rounded-sm border-l-2 border-border-strong pl-3 py-1.5">
                {label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Warnings" />
        {warnings.length === 0 ? (
          <p className="text-sm text-ink-muted">No warnings were reported for this run.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {warnings.map((label, index) => (
              <li key={index} className="rounded-sm border-l-2 border-warning bg-warning-soft px-3 py-1.5 text-ink">
                {label}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
