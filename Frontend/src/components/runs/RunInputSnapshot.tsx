import { Card, CardHeader } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/states/EmptyState";
import { formatMlPerDay, MISSING_VALUE } from "@/utils/formatters";
import { asArray, asRecord, pickBoolean, pickNumber, pickString } from "@/utils/jsonAccess";
import type { MilpModelInputDto } from "@/types/run";
import type { ScenarioDetail } from "@/types/scenario";

export interface RunInputSnapshotProps {
  input: MilpModelInputDto | null;
  scenario: ScenarioDetail | null;
}

/**
 * MILP input section (AquaBlend_Frontend_Final_Integration_Implementation.md
 * §12). `scenario` is the current, editable Scenario (may have since
 * changed); `input.frontendInputJson`/`canonicalInputJson` are the immutable
 * snapshot frozen at run-creation time — they are not guaranteed to match
 * `scenario` after later edits, and this is shown explicitly rather than
 * silently conflated.
 */
export function RunInputSnapshot({ input, scenario }: RunInputSnapshotProps) {
  if (!input && !scenario) {
    return (
      <EmptyState
        title="No input snapshot available"
        description="This is a legacy run created before per-run input snapshots existed."
      />
    );
  }

  // frontendInputJson is ScenarioFormState-shaped (camelCase) — see
  // Services/MilpInputSnapshotService.cs. Read defensively regardless.
  const frontend = asRecord(input?.frontendInputJson);
  const sources = asArray(frontend.sources).map(asRecord);
  const plants = asArray(frontend.plants).map(asRecord);
  const demandZones = asArray(frontend.demandZones).map(asRecord);
  const networkOverrides = asArray(frontend.networkOverrides).map(asRecord);
  const qualityProfileId = pickString(frontend, "qualityProfileId") ?? scenario?.qualityProfileId ?? null;

  const scenarioName = input?.scenarioName ?? scenario?.scenarioName ?? MISSING_VALUE;
  const scenarioStatus = input?.scenarioStatus ?? scenario?.status ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Scenario Overview"
          description="The scenario as it existed when this run was created."
        />
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-faint">Scenario</dt>
            <dd className="font-medium text-ink">{scenarioName}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Status at run time</dt>
            <dd className="text-ink">{scenarioStatus ? <StatusPill label={scenarioStatus} tone="neutral" /> : MISSING_VALUE}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Data source</dt>
            <dd className="text-ink">{input?.dataSourceType ?? MISSING_VALUE}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Allow estimated values</dt>
            <dd className="text-ink">{input ? (input.allowEstimatedValues ? "Yes" : "No") : MISSING_VALUE}</dd>
          </div>
        </dl>
        {input ? (
          <p className="mt-4 text-xs text-ink-faint">
            This snapshot is immutable — editing the scenario afterwards does not change it.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Selected Sources" />
        {sources.length === 0 ? (
          <p className="text-sm text-ink-muted">No sources recorded in this snapshot.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {sources.map((s, index) => {
              const sourceId = pickString(s, "sourceId", "source_id") ?? `source-${index}`;
              const enabled = pickBoolean(s, "enabled") ?? false;
              const forcedInactive = pickBoolean(s, "forcedInactive", "forced_inactive") ?? false;
              return (
                <li key={sourceId} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs text-ink">{sourceId}</span>
                  <StatusPill
                    label={forcedInactive ? "Forced inactive" : enabled ? "Enabled" : "Disabled"}
                    tone={forcedInactive ? "warning" : enabled ? "success" : "neutral"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Treatment Plants" />
        {plants.length === 0 ? (
          <p className="text-sm text-ink-muted">No plants recorded in this snapshot.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {plants.map((p, index) => {
              const plantId = pickString(p, "plantId", "plant_id") ?? `plant-${index}`;
              const enabled = pickBoolean(p, "enabled") ?? false;
              return (
                <li key={plantId} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs text-ink">{plantId}</span>
                  <StatusPill label={enabled ? "Enabled" : "Disabled"} tone={enabled ? "success" : "neutral"} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Demand Zones" />
        {demandZones.length === 0 ? (
          <p className="text-sm text-ink-muted">No demand zones recorded in this snapshot.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {demandZones.map((z, index) => {
              const zoneId = pickString(z, "zoneId", "zone_id") ?? `zone-${index}`;
              const demand = pickNumber(z, "demandMlPerDay", "demand_ml_per_day");
              return (
                <li key={zoneId} className="py-2 flex justify-between text-sm">
                  <span className="font-mono text-xs text-ink">{zoneId}</span>
                  <span className="text-ink-muted">{demand !== null ? formatMlPerDay(demand) : MISSING_VALUE}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Water Quality Limits" />
        <p className="text-sm text-ink">{qualityProfileId ?? MISSING_VALUE}</p>
      </Card>

      <Card>
        <CardHeader title="Network Overrides" />
        {networkOverrides.length === 0 ? (
          <p className="text-sm text-ink-muted">Using default network configuration.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {networkOverrides.map((o, index) => {
              const linkId = pickString(o, "linkId", "link_id") ?? `override-${index}`;
              const kind = pickString(o, "kind") ?? "override";
              return <li key={linkId}>{linkId}: {kind.replace(/_/g, " ")}</li>;
            })}
          </ul>
        )}
      </Card>

      {input ? (
        <Card>
          <CardHeader title="Validation Policy" description="Applied when the canonical input snapshot was built." />
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={`Missing source in DB: ${input.failIfSourceMissingFromDatabase ? "fail" : "allow"}`}
              tone={input.failIfSourceMissingFromDatabase ? "warning" : "neutral"}
            />
            <StatusPill
              label={`Missing daily availability: ${input.failIfDailyAvailabilityMissing ? "fail" : "allow"}`}
              tone={input.failIfDailyAvailabilityMissing ? "warning" : "neutral"}
            />
            <StatusPill
              label={`Missing quality value: ${input.failIfRequiredQualityValueMissing ? "fail" : "allow"}`}
              tone={input.failIfRequiredQualityValueMissing ? "warning" : "neutral"}
            />
            <StatusPill
              label={`Missing demand: ${input.failIfDemandMissing ? "fail" : "allow"}`}
              tone={input.failIfDemandMissing ? "warning" : "neutral"}
            />
          </div>
        </Card>
      ) : null}

      {input ? (
        <Card padding="sm">
          <Collapsible summary="View run input snapshot (technical)">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-ink-muted sm:grid-cols-3">
              <div>
                <dt className="text-ink-faint">Input status</dt>
                <dd className="font-mono">{input.inputStatus}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Contract version</dt>
                <dd className="font-mono">{input.inputContractVersion}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Canonical input hash</dt>
                <dd className="font-mono">{input.canonicalInputHash ?? MISSING_VALUE}</dd>
              </div>
            </dl>
            <pre className="mt-4 max-h-96 overflow-auto rounded-sm bg-surface-sunken p-3 text-xs">
              {JSON.stringify(input.canonicalInputJson, null, 2)}
            </pre>
          </Collapsible>
        </Card>
      ) : null}
    </div>
  );
}
