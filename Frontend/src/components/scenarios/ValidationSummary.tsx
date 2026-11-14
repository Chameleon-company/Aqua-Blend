import { StatusPill } from "@/components/ui/StatusPill";
import type { ValidationIssue } from "@/types/scenario";

export interface ValidationSummaryProps {
  issues: ValidationIssue[];
  title?: string;
}

/** Renders both frontend-only and backend-returned validation issues identically. */
export function ValidationSummary({ issues, title = "Validation Summary" }: ValidationSummaryProps) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <StatusPill label="Scenario Ready" tone="success" />
        <p className="text-sm text-ink-muted">No validation issues.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <StatusPill label={errors.length > 0 ? "Scenario Not Ready" : "Scenario Ready (with warnings)"} tone={errors.length > 0 ? "danger" : "warning"} />
        <p className="text-xs text-ink-faint">{title}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {errors.map((issue, index) => (
          <li key={`e-${index}-${issue.message}`} className="text-danger">
            • {issue.message}
          </li>
        ))}
        {warnings.map((issue, index) => (
          <li key={`w-${index}-${issue.message}`} className="text-warning">
            • {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
