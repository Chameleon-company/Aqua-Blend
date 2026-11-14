import { SortableTable, type Column } from "@/components/tables/SortableTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatCurrency, formatMlPerDay, formatPercent, MISSING_VALUE } from "@/utils/formatters";
import type { SourceAllocation } from "@/types/milp-results";

function SourceFlags({ source }: { source: SourceAllocation }) {
  const flags: { label: string; tone: "warning" | "info" | "success" }[] = [];
  if (source.isEstimated) flags.push({ label: "Estimated", tone: "warning" });
  if (source.modelReady === false) flags.push({ label: "Not model-ready", tone: "warning" });
  if (source.bindingCapacity) flags.push({ label: "At capacity", tone: "info" });

  if (flags.length === 0) return <span className="text-ink-faint">{MISSING_VALUE}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <StatusPill key={flag.label} label={flag.label} tone={flag.tone} />
      ))}
    </div>
  );
}

function SourceDetail({ source }: { source: SourceAllocation }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-ink-faint">Min withdrawal</dt>
        <dd>{source.minWithdrawalMlPerDay !== undefined ? formatMlPerDay(source.minWithdrawalMlPerDay) : MISSING_VALUE}</dd>
      </div>
      <div>
        <dt className="text-ink-faint">Max withdrawal</dt>
        <dd>{source.maxWithdrawalMlPerDay !== undefined ? formatMlPerDay(source.maxWithdrawalMlPerDay) : MISSING_VALUE}</dd>
      </div>
      <div>
        <dt className="text-ink-faint">Cost rank</dt>
        <dd>{source.costRank ?? MISSING_VALUE}</dd>
      </div>
      <div>
        <dt className="text-ink-faint">Availability</dt>
        <dd>{source.availabilityStatus ?? MISSING_VALUE}</dd>
      </div>
      <div className="col-span-2">
        <dt className="text-ink-faint">Provenance</dt>
        <dd>{source.provenance ?? MISSING_VALUE}</dd>
      </div>
      <div className="col-span-2 sm:col-span-4">
        <dt className="text-ink-faint">Decision evidence</dt>
        <dd>{source.decisionEvidence?.length ? source.decisionEvidence.join("; ") : MISSING_VALUE}</dd>
      </div>
    </dl>
  );
}

export function SourceResults({ selected, unused }: { selected: SourceAllocation[]; unused: SourceAllocation[] }) {
  const columns: Column<SourceAllocation>[] = [
    {
      key: "source",
      header: "Source",
      sortValue: (s) => s.sourceName ?? s.sourceId,
      render: (s) => (
        <div>
          <div className="font-medium text-ink">{s.sourceName ?? s.sourceId}</div>
          {s.sourceName ? <div className="font-mono text-xs text-ink-faint">{s.sourceId}</div> : null}
        </div>
      ),
    },
    {
      key: "withdrawal",
      header: "Withdrawal",
      align: "right",
      sortValue: (s) => s.withdrawalMlPerDay,
      render: (s) => formatMlPerDay(s.withdrawalMlPerDay),
    },
    {
      key: "blendRatio",
      header: "Blend Ratio",
      align: "right",
      sortValue: (s) => s.blendRatio,
      render: (s) => formatPercent(s.blendRatio),
    },
    {
      key: "utilisation",
      header: "Utilisation",
      align: "right",
      sortValue: (s) => s.utilisationPercent ?? null,
      render: (s) => (s.utilisationPercent !== undefined ? formatPercent(s.utilisationPercent) : MISSING_VALUE),
    },
    {
      key: "fixedCost",
      header: "Fixed Cost",
      align: "right",
      sortValue: (s) => s.fixedCostContribution,
      render: (s) => formatCurrency(s.fixedCostContribution),
    },
    {
      key: "withdrawalCost",
      header: "Withdrawal Cost",
      align: "right",
      sortValue: (s) => s.withdrawalCostContribution,
      render: (s) => formatCurrency(s.withdrawalCostContribution),
    },
    {
      key: "flags",
      header: "Flags",
      render: (s) => <SourceFlags source={s} />,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Selected sources</h3>
        <SortableTable
          caption="Selected water sources and their contribution to the solved blend"
          columns={columns}
          rows={selected}
          getRowKey={(s) => s.sourceId}
          renderExpanded={(s) => <SourceDetail source={s} />}
          emptyMessage="No sources were selected in this solution."
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Unused sources</h3>
        {unused.length === 0 ? (
          <p className="text-sm text-ink-muted">All sources were used in this solution.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {unused.map((source) => (
              <li key={source.sourceId} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium text-ink">{source.sourceName ?? source.sourceId}</span>
                  {source.availabilityStatus ? (
                    <span className="ml-2 text-xs text-ink-faint">{source.availabilityStatus}</span>
                  ) : null}
                </div>
                <span className="text-sm text-ink-muted">
                  {source.reason ?? "Not selected in solved solution"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
