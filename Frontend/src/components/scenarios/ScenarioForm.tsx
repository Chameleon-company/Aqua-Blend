"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/states/Skeleton";
import { FailedState } from "@/components/states/FailedState";
import { ScenarioDetailsSection } from "./ScenarioDetailsSection";
import { SourceSelectionTable } from "./SourceSelectionTable";
import { PlantSelectionTable } from "./PlantSelectionTable";
import { DemandZoneEditor } from "./DemandZoneEditor";
import { QualityProfileSelector } from "./QualityProfileSelector";
import { AdvancedNetworkOverrides } from "./AdvancedNetworkOverrides";
import { ValidationSummary } from "./ValidationSummary";
import { getSources, getPlants, getDemandZones, getNetworkLinks, getQualityProfiles } from "@/services/referenceDataApi";
import { createScenario, updateScenario, validateScenario } from "@/services/scenarioApi";
import { toAppError } from "@/services/errorMapping";
import { validateScenarioFormState } from "@/utils/scenarioValidation";
import type { DemandZoneRef, NetworkLinkRef, PlantRef, QualityProfile, SourceRef } from "@/types/reference-data";
import type { ScenarioFormState } from "@/types/scenario";
import type { AppError } from "@/types/errors";

export interface ScenarioFormProps {
  mode: "create" | "edit";
  scenarioId?: string;
  initial?: ScenarioFormState;
}

interface ReferenceData {
  sources: SourceRef[];
  plants: PlantRef[];
  demandZones: DemandZoneRef[];
  qualityProfiles: QualityProfile[];
  networkLinks: NetworkLinkRef[];
}

function buildDefaultForm(ref: ReferenceData): ScenarioFormState {
  return {
    scenarioName: "",
    description: "",
    sources: ref.sources.map((s) => ({ sourceId: s.sourceId, enabled: true })),
    plants: ref.plants.map((p) => ({ plantId: p.plantId, enabled: true })),
    demandZones: ref.demandZones.map((z) => ({ zoneId: z.zoneId, demandMlPerDay: null })),
    qualityProfileId: null,
    networkOverrides: [],
  };
}

/** Ensures every current reference-data row has a selection entry, even if the scenario predates it. */
function reconcile(form: ScenarioFormState, ref: ReferenceData): ScenarioFormState {
  return {
    ...form,
    sources: ref.sources.map((s) => form.sources.find((sel) => sel.sourceId === s.sourceId) ?? { sourceId: s.sourceId, enabled: true }),
    plants: ref.plants.map((p) => form.plants.find((sel) => sel.plantId === p.plantId) ?? { plantId: p.plantId, enabled: true }),
    demandZones: ref.demandZones.map((z) => form.demandZones.find((sel) => sel.zoneId === z.zoneId) ?? { zoneId: z.zoneId, demandMlPerDay: null }),
  };
}

export function ScenarioForm({ mode, scenarioId, initial }: ScenarioFormProps) {
  const router = useRouter();
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [referenceError, setReferenceError] = useState<AppError | null>(null);
  const [form, setForm] = useState<ScenarioFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<AppError | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSources(), getPlants(), getDemandZones(), getQualityProfiles(), getNetworkLinks()])
      .then(([sources, plants, demandZones, qualityProfiles, networkLinks]) => {
        if (cancelled) return;
        const ref: ReferenceData = { sources, plants, demandZones, qualityProfiles, networkLinks };
        setReferenceData(ref);
        setForm(initial ? reconcile(initial, ref) : buildDefaultForm(ref));
      })
      .catch((err) => {
        if (!cancelled) setReferenceError(toAppError(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const issues = useMemo(() => {
    if (!form || !referenceData) return [];
    return validateScenarioFormState(form, referenceData.demandZones);
  }, [form, referenceData]);

  const hasBlockingIssues = issues.some((i) => i.severity === "error");

  async function handleSave() {
    if (!form || hasBlockingIssues) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = mode === "create" ? await createScenario(form) : await updateScenario(scenarioId!, form);
      await validateScenario(saved.scenarioId);
      router.push(`/scenarios/${saved.scenarioId}`);
    } catch (err) {
      setSaveError(toAppError(err));
    } finally {
      setSaving(false);
    }
  }

  if (referenceError) {
    return <FailedState message="Could not load reference data for the scenario builder." detail={referenceError.message} />;
  }

  if (!referenceData || !form) {
    return <TableSkeleton rows={6} columns={5} />;
  }

  return (
    <div className="flex flex-col">
      <Section id="details" title="Scenario Details">
        <ScenarioDetailsSection
          scenarioName={form.scenarioName}
          description={form.description}
          onChangeName={(scenarioName) => setForm({ ...form, scenarioName })}
          onChangeDescription={(description) => setForm({ ...form, description })}
        />
      </Section>

      <Section id="sources" title="Sources" description="Which sources are available for this scenario, and any overrides.">
        <SourceSelectionTable
          selections={form.sources}
          sourceRefs={referenceData.sources}
          onChange={(sources) => setForm({ ...form, sources })}
        />
      </Section>

      <Section id="plants" title="Treatment Plants" description="Which treatment plants are available. The MILP decides actual throughput.">
        <PlantSelectionTable
          selections={form.plants}
          plantRefs={referenceData.plants}
          onChange={(plants) => setForm({ ...form, plants })}
        />
      </Section>

      <Section id="demand" title="Demand Zones" description="Enter demand for each zone.">
        <DemandZoneEditor
          zones={form.demandZones}
          demandZoneRefs={referenceData.demandZones}
          onChange={(demandZones) => setForm({ ...form, demandZones })}
        />
      </Section>

      <Section id="quality" title="Water Quality">
        <QualityProfileSelector
          profiles={referenceData.qualityProfiles}
          value={form.qualityProfileId}
          onChange={(qualityProfileId) => setForm({ ...form, qualityProfileId })}
        />
      </Section>

      <Section id="network" title="Advanced Network Overrides">
        <AdvancedNetworkOverrides
          overrides={form.networkOverrides}
          networkLinkRefs={referenceData.networkLinks}
          onChange={(networkOverrides) => setForm({ ...form, networkOverrides })}
        />
      </Section>

      <Section id="validation" title="Validation Summary">
        <ValidationSummary issues={issues} />
      </Section>

      {saveError ? (
        <div className="pt-4">
          <FailedState message="Could not save this scenario." detail={saveError.message} />
        </div>
      ) : null}

      <div className="pt-8 flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving || hasBlockingIssues}>
          {saving ? "Saving…" : "Save Scenario"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/scenarios")} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
