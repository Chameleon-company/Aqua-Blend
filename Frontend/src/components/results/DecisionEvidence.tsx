import { formatPercent, MISSING_VALUE } from "@/utils/formatters";
import type { DecisionEvidenceSummary } from "@/types/milp-results";

function EvidenceList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1">
        <ul className="flex flex-col gap-1 text-sm text-ink">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

/**
 * layout.md §14 — display evidence supplied by the solver only. Never infer
 * causal reasoning ("selected because it was cheapest") beyond what the
 * contract states.
 */
export function DecisionEvidence({ evidence }: { evidence?: DecisionEvidenceSummary }) {
  if (!evidence) {
    return <p className="text-sm text-ink-muted">No decision evidence was supplied for this result.</p>;
  }

  return (
    <dl className="grid gap-6 sm:grid-cols-2">
      {evidence.feasibilityState ? (
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Feasibility state</dt>
          <dd className="mt-1 text-sm text-ink">{evidence.feasibilityState}</dd>
        </div>
      ) : null}

      <EvidenceList label="Binding quality limits" items={evidence.bindingQualityLimits} />
      <EvidenceList label="Sources at maximum withdrawal" items={evidence.sourcesAtMaxWithdrawal} />
      <EvidenceList label="Sources at minimum withdrawal" items={evidence.sourcesAtMinWithdrawal} />
      <EvidenceList label="Plants at maximum throughput" items={evidence.plantsAtMaxThroughput} />
      <EvidenceList label="Links at maximum flow" items={evidence.linksAtMaxFlow} />
      <EvidenceList label="Binding constraints" items={evidence.bindingConstraintLabels} />

      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Utilisation</dt>
        <dd className="mt-1 text-sm text-ink">
          {evidence.utilisationPercent !== undefined ? formatPercent(evidence.utilisationPercent) : MISSING_VALUE}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Cost rank</dt>
        <dd className="mt-1 text-sm text-ink">{evidence.costRank ?? MISSING_VALUE}</dd>
      </div>
    </dl>
  );
}
