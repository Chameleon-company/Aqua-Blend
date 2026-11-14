import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ScenarioStatusBadge } from "./ScenarioStatusBadge";
import { formatDateTime } from "@/utils/formatters";
import { getRunStatusMeta } from "@/utils/resultStatus";
import type { ScenarioSummary } from "@/types/scenario";

export interface ScenarioCardProps {
  scenario: ScenarioSummary;
  onRun?: (scenarioId: string) => void;
  running?: boolean;
}

export function ScenarioCard({ scenario, onRun, running }: ScenarioCardProps) {
  // getRunStatusMeta is defensive by design — safe for any status string,
  // real backend workflow statuses included (utils/resultStatus.ts).
  const runStatusMeta = scenario.mostRecentRun ? getRunStatusMeta(scenario.mostRecentRun.status) : undefined;

  return (
    <div className="border border-border rounded-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{scenario.scenarioName}</p>
          <p className="font-mono text-xs text-ink-faint">{scenario.scenarioId}</p>
        </div>
        <ScenarioStatusBadge status={scenario.status} />
      </div>

      {scenario.description ? <p className="text-sm text-ink-muted">{scenario.description}</p> : null}

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-faint">
        <div>
          <dt className="inline">Last modified: </dt>
          <dd className="inline">{formatDateTime(scenario.updatedAt)}</dd>
        </div>
        <div>
          <dt className="inline">Most recent run: </dt>
          <dd className="inline">{runStatusMeta ? runStatusMeta.label : "None"}</dd>
        </div>
      </dl>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Link href={`/scenarios/${scenario.scenarioId}`}>
          <Button size="sm" variant="secondary">View</Button>
        </Link>
        <Link href={`/scenarios/${scenario.scenarioId}/edit`}>
          <Button size="sm" variant="secondary">Edit</Button>
        </Link>
        {onRun ? (
          <Button size="sm" disabled={scenario.status !== "ready" || running} onClick={() => onRun(scenario.scenarioId)}>
            {running ? "Starting…" : "Run Optimisation"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
