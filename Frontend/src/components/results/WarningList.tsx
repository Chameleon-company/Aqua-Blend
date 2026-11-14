import type { RunWarning, WarningSeverity } from "@/types/milp-results";
import clsx from "clsx";

const severityLabel: Record<WarningSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

const severityClasses: Record<WarningSeverity, string> = {
  info: "border-border-strong text-ink-muted",
  warning: "border-warning text-warning",
  critical: "border-danger text-danger",
};

/**
 * layout.md §16 — warnings and data-quality section.
 * Renders only what the contract supplies; an empty array renders nothing.
 * Severity is conveyed by the text label, not by colour or icon alone.
 */
export function WarningList({ warnings }: { warnings: RunWarning[] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {warnings.map((warning, index) => {
        const severity = warning.severity ?? "warning";
        return (
          <li
            key={warning.code ?? `${index}-${warning.message}`}
            className={clsx("flex items-start gap-2 rounded-sm border-l-2 pl-3 py-1.5 text-sm", severityClasses[severity])}
          >
            <span className="text-xs font-semibold uppercase tracking-wide shrink-0">{severityLabel[severity]}</span>
            <span className="text-ink">{warning.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
