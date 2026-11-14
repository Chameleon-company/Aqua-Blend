import { StatusPill } from "@/components/ui/StatusPill";
import { getScenarioStatusMeta } from "@/utils/resultStatus";
import type { ScenarioStatus } from "@/types/scenario";

export function ScenarioStatusBadge({ status }: { status: ScenarioStatus }) {
  const meta = getScenarioStatusMeta(status);
  return <StatusPill label={meta.label} tone={meta.tone} />;
}
