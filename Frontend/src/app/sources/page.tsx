"use client";

import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/states/Skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { getSources } from "@/services/referenceDataApi";
import { formatCurrency, formatMlPerDay, formatPh, formatAlkalinity, formatNtu, MISSING_VALUE } from "@/utils/formatters";
import type { SourceFilters, SourceRef } from "@/types/reference-data";

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceRef[] | null>(null);
  const [filters, setFilters] = useState<SourceFilters>({});

  useEffect(() => {
    let cancelled = false;
    getSources(filters).then((data) => {
      if (!cancelled) setSources(data);
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const [allSources, setAllSources] = useState<SourceRef[]>([]);
  useEffect(() => {
    getSources().then(setAllSources);
  }, []);

  const sourceTypes = useMemo(() => Array.from(new Set(allSources.map((s) => s.sourceType).filter(Boolean))) as string[], [allSources]);
  const availabilities = useMemo(() => Array.from(new Set(allSources.map((s) => s.availabilityStatus).filter(Boolean))) as string[], [allSources]);

  const columns: Column<SourceRef>[] = [
    {
      key: "name",
      header: "Source",
      sortValue: (s) => s.name ?? s.sourceId,
      render: (s) => (
        <div>
          <div className="font-medium text-ink">{s.name ?? s.sourceId}</div>
          <div className="font-mono text-xs text-ink-faint">{s.sourceId}</div>
        </div>
      ),
    },
    { key: "type", header: "Type", sortValue: (s) => s.sourceType ?? "", render: (s) => s.sourceType ?? MISSING_VALUE },
    {
      key: "availability",
      header: "Availability",
      sortValue: (s) => s.availabilityStatus ?? "",
      render: (s) => (s.availabilityStatus ? <StatusPill label={s.availabilityStatus} tone={s.availabilityStatus === "Available" ? "success" : "neutral"} /> : MISSING_VALUE),
    },
    {
      key: "modelReady",
      header: "Model Ready",
      sortValue: (s) => (s.modelReady ? 1 : 0),
      render: (s) => <StatusPill label={s.modelReady ? "Ready" : "Not ready"} tone={s.modelReady ? "success" : "warning"} />,
    },
    {
      key: "capacity",
      header: "Capacity",
      align: "right",
      sortValue: (s) => s.defaultMaxWithdrawalMlPerDay ?? null,
      render: (s) => (s.defaultMaxWithdrawalMlPerDay !== undefined ? formatMlPerDay(s.defaultMaxWithdrawalMlPerDay) : MISSING_VALUE),
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      sortValue: (s) => s.cost ?? null,
      render: (s) => (s.cost !== undefined ? formatCurrency(s.cost) : MISSING_VALUE),
    },
    { key: "pH", header: "pH", align: "right", sortValue: (s) => s.quality?.pH ?? null, render: (s) => formatPh(s.quality?.pH) },
    {
      key: "alkalinity",
      header: "Alkalinity",
      align: "right",
      sortValue: (s) => s.quality?.alkalinityMgPerLCaCO3 ?? null,
      render: (s) => formatAlkalinity(s.quality?.alkalinityMgPerLCaCO3),
    },
    {
      key: "turbidity",
      header: "Turbidity",
      align: "right",
      sortValue: (s) => s.quality?.turbidityNtu ?? null,
      render: (s) => formatNtu(s.quality?.turbidityNtu),
    },
    {
      key: "estimated",
      header: "Data",
      render: (s) => <StatusPill label={s.isEstimated ? "Estimated" : "Measured"} tone={s.isEstimated ? "warning" : "success"} />,
    },
    { key: "provenance", header: "Provenance", render: (s) => s.provenance ?? MISSING_VALUE },
  ];

  return (
    <PageContainer className="py-8">
      <PageHeading
        title="Sources"
        description="Read-only view of water sources available for scenario optimisation, for transparency and scenario understanding."
      />

      <div className="flex flex-wrap gap-6 mb-6 max-w-3xl">
        <div className="w-48">
          <Field id="filter-type" label="Source type">
            <Select id="filter-type" value={filters.sourceType ?? ""} onChange={(e) => setFilters((f) => ({ ...f, sourceType: e.target.value || undefined }))}>
              <option value="">All types</option>
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-48">
          <Field id="filter-availability" label="Availability">
            <Select id="filter-availability" value={filters.availability ?? ""} onChange={(e) => setFilters((f) => ({ ...f, availability: e.target.value || undefined }))}>
              <option value="">All availability</option>
              {availabilities.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-48">
          <Field id="filter-ready" label="Model ready">
            <Select
              id="filter-ready"
              value={filters.modelReady === undefined ? "" : String(filters.modelReady)}
              onChange={(e) => setFilters((f) => ({ ...f, modelReady: e.target.value === "" ? undefined : e.target.value === "true" }))}
            >
              <option value="">Any</option>
              <option value="true">Ready</option>
              <option value="false">Not ready</option>
            </Select>
          </Field>
        </div>
        <div className="w-48">
          <Field id="filter-estimated" label="Data quality">
            <Select
              id="filter-estimated"
              value={filters.estimatedOrMeasured ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, estimatedOrMeasured: (e.target.value || undefined) as SourceFilters["estimatedOrMeasured"] }))}
            >
              <option value="">All</option>
              <option value="measured">Measured</option>
              <option value="estimated">Estimated</option>
            </Select>
          </Field>
        </div>
      </div>

      {sources === null ? <TableSkeleton columns={9} /> : null}
      {sources !== null && sources.length === 0 ? <EmptyState title="No sources match these filters" /> : null}
      {sources !== null && sources.length > 0 ? (
        <SortableTable caption="Water sources available for optimisation" columns={columns} rows={sources} getRowKey={(s) => s.sourceId} />
      ) : null}
    </PageContainer>
  );
}
