"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { TableSkeleton } from "@/components/states/Skeleton";
import { FailedState } from "@/components/states/FailedState";
import { ScenarioForm } from "@/components/scenarios/ScenarioForm";
import { getScenario } from "@/services/scenarioApi";
import { toAppError } from "@/services/errorMapping";
import { toScenarioFormState } from "@/types/scenario";
import type { ScenarioDetail } from "@/types/scenario";
import type { AppError } from "@/types/errors";

export default function EditScenarioPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = params.scenarioId;
  const [detail, setDetail] = useState<ScenarioDetail | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let cancelled = false;
    getScenario(scenarioId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(toAppError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  return (
    <PageContainer className="py-8">
      <PageHeading title="Edit Scenario" description={scenarioId} />

      {error ? <FailedState message="Could not load this scenario." detail={error.message} /> : null}
      {!error && !detail ? <TableSkeleton rows={6} columns={5} /> : null}
      {!error && detail ? <ScenarioForm mode="edit" scenarioId={scenarioId} initial={toScenarioFormState(detail)} /> : null}
    </PageContainer>
  );
}
