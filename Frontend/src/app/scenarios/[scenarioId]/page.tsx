"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/states/Skeleton";
import { FailedState } from "@/components/states/FailedState";
import { ScenarioStatusBadge } from "@/components/scenarios/ScenarioStatusBadge";
import { ValidationSummary } from "@/components/scenarios/ValidationSummary";
import { RunHistoryTable } from "@/components/scenarios/RunHistoryTable";
import { formatMlPerDay, formatDateTime, MISSING_VALUE } from "@/utils/formatters";
import { getScenario, validateScenario } from "@/services/scenarioApi";
import { getSources, getPlants, getDemandZones, getQualityProfiles } from "@/services/referenceDataApi";
import { createRun, getScenarioRuns } from "@/services/runApi";
import { toAppError } from "@/services/errorMapping";
import type { ScenarioDetail } from "@/types/scenario";
import type { DemandZoneRef, PlantRef, QualityProfile, SourceRef } from "@/types/reference-data";
import type { RunSummary } from "@/types/run";
import type { AppError } from "@/types/errors";

export default function ScenarioDetailPage() {
  const params = useParams<{ scenarioId: string }>();
  const router = useRouter();
  const scenarioId = params.scenarioId;

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [plants, setPlants] = useState<PlantRef[]>([]);
  const [demandZones, setDemandZones] = useState<DemandZoneRef[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfile[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [validating, setValidating] = useState(false);
  const [running, setRunning] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [actionError, setActionError] = useState<AppError | null>(null);

  const load = useCallback(() => {
    Promise.all([getScenario(scenarioId), getSources(), getPlants(), getDemandZones(), getQualityProfiles(), getScenarioRuns(scenarioId)])
      .then(([s, src, pl, zones, profiles, runHistory]) => {
        setScenario(s);
        setSources(src);
        setPlants(pl);
        setDemandZones(zones);
        setQualityProfiles(profiles);
        setRuns(runHistory);
        setError(null);
      })
      .catch((err) => setError(toAppError(err)));
  }, [scenarioId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleValidate() {
    setValidating(true);
    setActionError(null);
    try {
      await validateScenario(scenarioId);
      load();
    } catch (err) {
      setActionError(toAppError(err));
    } finally {
      setValidating(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setActionError(null);
    try {
      const { runId } = await createRun(scenarioId, { forceRerun: false });
      router.push(`/runs/${runId}`);
    } catch (err) {
      setActionError(toAppError(err));
      setRunning(false);
    }
  }

  // Recommended secondary action (AquaBlend_Frontend_Final_Integration_
  // Implementation.md §8): ignores a reusable optimisation result and
  // executes the MILP again — never implies the scenario input changed.
  async function handleForceRerun() {
    setForcing(true);
    setActionError(null);
    try {
      const { runId } = await createRun(scenarioId, { forceRerun: true });
      router.push(`/runs/${runId}`);
    } catch (err) {
      setActionError(toAppError(err));
      setForcing(false);
    }
  }

  if (error) {
    return (
      <PageContainer className="py-8">
        <FailedState message="Could not load this scenario." detail={error.message} />
      </PageContainer>
    );
  }

  if (!scenario) {
    return (
      <PageContainer className="py-8">
        <TableSkeleton rows={6} columns={5} />
      </PageContainer>
    );
  }

  const enabledSources = scenario.sources.filter((s) => s.enabled && !s.forcedInactive);
  const enabledPlants = scenario.plants.filter((p) => p.enabled);
  const qualityProfile = qualityProfiles.find((q) => q.profileId === scenario.qualityProfileId);

  return (
    <PageContainer className="py-8">
      <PageHeading
        title={scenario.scenarioName}
        description={scenario.scenarioId}
        action={
          <div className="flex items-center gap-3">
            <ScenarioStatusBadge status={scenario.status} />
            <Link href={`/scenarios/${scenarioId}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={handleValidate} disabled={validating}>
              {validating ? "Validating…" : "Validate"}
            </Button>
            <Button size="sm" disabled={scenario.status !== "ready" || running || forcing} onClick={handleRun}>
              {running ? "Starting…" : "Run Optimisation"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={scenario.status !== "ready" || running || forcing}
              onClick={handleForceRerun}
              title="Force re-run ignores a reusable optimisation result and executes the MILP again. It does not change the scenario input."
            >
              {forcing ? "Starting…" : "Force full re-run"}
            </Button>
          </div>
        }
      />

      {actionError ? <div className="mb-6"><FailedState message="Action failed." detail={actionError.message} /></div> : null}

      <Section id="details" title="Scenario Details">
        <p className="text-sm text-ink-muted max-w-2xl">{scenario.description || "No description provided."}</p>
        <p className="mt-2 text-xs text-ink-faint">Last modified {formatDateTime(scenario.updatedAt)}</p>
      </Section>

      <Section id="sources" title="Sources">
        <ul className="flex flex-col divide-y divide-border">
          {enabledSources.map((s) => {
            const ref = sources.find((r) => r.sourceId === s.sourceId);
            return (
              <li key={s.sourceId} className="py-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-ink">{ref?.name ?? s.sourceId}</span>
                <span className="text-ink-faint">
                  {s.minWithdrawalOverrideMlPerDay !== undefined || s.maxWithdrawalOverrideMlPerDay !== undefined
                    ? `Override: ${s.minWithdrawalOverrideMlPerDay !== undefined ? formatMlPerDay(s.minWithdrawalOverrideMlPerDay) : MISSING_VALUE} – ${s.maxWithdrawalOverrideMlPerDay !== undefined ? formatMlPerDay(s.maxWithdrawalOverrideMlPerDay) : MISSING_VALUE}`
                    : "Default capacity"}
                </span>
              </li>
            );
          })}
          {enabledSources.length === 0 ? <li className="py-2 text-sm text-ink-muted">No sources enabled.</li> : null}
        </ul>
      </Section>

      <Section id="plants" title="Treatment Plants">
        <ul className="flex flex-col divide-y divide-border">
          {enabledPlants.map((p) => {
            const ref = plants.find((r) => r.plantId === p.plantId);
            return (
              <li key={p.plantId} className="py-2 text-sm text-ink">
                {ref?.name ?? p.plantId}
              </li>
            );
          })}
          {enabledPlants.length === 0 ? <li className="py-2 text-sm text-ink-muted">No plants enabled.</li> : null}
        </ul>
      </Section>

      <Section id="demand" title="Demand">
        <ul className="flex flex-col divide-y divide-border">
          {scenario.demandZones.map((z) => {
            const ref = demandZones.find((r) => r.zoneId === z.zoneId);
            return (
              <li key={z.zoneId} className="py-2 flex justify-between text-sm">
                <span className="text-ink">{ref?.name ?? z.zoneId}</span>
                <span className="text-ink-muted">{z.demandMlPerDay !== null && z.demandMlPerDay !== undefined ? formatMlPerDay(z.demandMlPerDay) : MISSING_VALUE}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="quality" title="Water Quality">
        <p className="text-sm text-ink">{qualityProfile?.name ?? MISSING_VALUE}</p>
      </Section>

      <Section id="overrides" title="Advanced Network Overrides">
        {scenario.networkOverrides.length === 0 ? (
          <p className="text-sm text-ink-muted">Using current network configuration.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {scenario.networkOverrides.map((o) => (
              <li key={o.linkId}>
                {o.linkId}: {o.kind === "capacity_override" ? `Capacity override (${formatMlPerDay(o.capacityOverrideMlPerDay ?? 0)})` : "Simulated outage"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="validation" title="Validation">
        <ValidationSummary issues={scenario.validationIssues} />
      </Section>

      <Section id="runs" title="Run History">
        <RunHistoryTable runs={runs} />
      </Section>
    </PageContainer>
  );
}
