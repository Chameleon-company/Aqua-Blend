import clsx from "clsx";
import type { Anomaly, AnomalySeverity } from "@/types/ai-analysis";

const severityLabel: Record<AnomalySeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

const severityClasses: Record<AnomalySeverity, string> = {
  info: "border-border-strong text-ink-muted",
  warning: "border-warning text-warning",
  critical: "border-danger text-danger",
};

/** Anomalies derived by the AI analysis — kept visually distinct from deterministic solver warnings. */
export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies || anomalies.length === 0) {
    return <p className="text-sm text-ink-muted">No anomalies were flagged for this run.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {anomalies.map((anomaly) => (
        <li
          key={anomaly.id}
          className={clsx("flex items-start gap-2 rounded-sm border-l-2 pl-3 py-1.5 text-sm", severityClasses[anomaly.severity])}
        >
          <span className="text-xs font-semibold uppercase tracking-wide shrink-0">{severityLabel[anomaly.severity]}</span>
          <span className="text-ink">
            {anomaly.message}
            {anomaly.relatedEntity ? <span className="ml-2 font-mono text-xs text-ink-faint">{anomaly.relatedEntity}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
