import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import type { Anomaly, AnomalySeverity } from "@/types/ai-analysis";

const SEVERITY_META: Record<AnomalySeverity, { label: string; icon: typeof Info; className: string }> = {
  critical: { label: "Critical", icon: AlertOctagon, className: "border-danger/30 bg-danger-soft text-danger" },
  warning: { label: "Warning", icon: AlertTriangle, className: "border-warning/30 bg-warning-soft text-warning" },
  info: { label: "Info", icon: Info, className: "border-border-strong bg-surface-alt text-ink-muted" },
};

/** How severe are the flagged anomalies, at a glance — counted from the same list rendered below. */
export function AnomalySeverityBreakdown({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) return null;

  const counts: Record<AnomalySeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const a of anomalies) counts[a.severity] += 1;

  return (
    <div className="flex flex-wrap gap-2">
      {(["critical", "warning", "info"] as AnomalySeverity[])
        .filter((severity) => counts[severity] > 0)
        .map((severity) => {
          const meta = SEVERITY_META[severity];
          const Icon = meta.icon;
          return (
            <span key={severity} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.className}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {counts[severity]} {meta.label}
            </span>
          );
        })}
    </div>
  );
}
