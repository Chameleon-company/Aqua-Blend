import { StatusPill } from "@/components/ui/StatusPill";
import { DIAGNOSTICS_STATE_META } from "@/utils/resultStatus";
import type { AsyncPhase } from "@/hooks/useRunPolling";
import type { DiagnosticsResult } from "@/types/diagnostics";

export interface DiagnosticPanelProps {
  phase: AsyncPhase;
  diagnostics?: DiagnosticsResult;
}

/**
 * An infeasible MILP result is not a frontend/system error — this panel only
 * displays backend-produced diagnostic data. The frontend never infers
 * infeasibility causes itself.
 */
export function DiagnosticPanel({ phase, diagnostics }: DiagnosticPanelProps) {
  const status = diagnostics?.status ?? (phase === "loading" ? "pending" : phase === "ready" ? "ready" : phase === "failed" ? "failed" : "pending");
  const meta = DIAGNOSTICS_STATE_META[status];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <StatusPill label={meta.label} tone={meta.tone} />
      </div>

      {phase === "loading" || phase === "idle" ? <p className="text-sm text-ink-muted">Waiting for diagnostics to be generated…</p> : null}

      {phase === "failed" ? (
        <p className="text-sm text-ink-muted">Detailed diagnostics are unavailable for this run right now.</p>
      ) : null}

      {diagnostics?.summary ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-1">Why this scenario is infeasible</p>
          <p className="text-sm leading-relaxed text-ink">{diagnostics.summary}</p>
        </div>
      ) : null}

      {diagnostics?.likelyCauses && diagnostics.likelyCauses.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-1.5">Likely causes</p>
          <ul className="flex flex-col gap-1 text-sm text-ink list-disc pl-4">
            {diagnostics.likelyCauses.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {diagnostics?.findings && diagnostics.findings.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-1.5">Affected sources / plants / links</p>
          <ul className="flex flex-col gap-2 text-sm text-ink">
            {diagnostics.findings.map((finding) => (
              <li key={finding.id} className="border border-border rounded-sm p-3">
                <p>{finding.description}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
                  {finding.affectedSources && finding.affectedSources.length > 0 ? <span>Sources: {finding.affectedSources.join(", ")}</span> : null}
                  {finding.affectedPlants && finding.affectedPlants.length > 0 ? <span>Plants: {finding.affectedPlants.join(", ")}</span> : null}
                  {finding.affectedLinks && finding.affectedLinks.length > 0 ? <span>Links: {finding.affectedLinks.join(", ")}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diagnostics?.suggestedInvestigation && diagnostics.suggestedInvestigation.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-1.5">Suggested investigation</p>
          <ul className="flex flex-col gap-1 text-sm text-ink list-disc pl-4">
            {diagnostics.suggestedInvestigation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
