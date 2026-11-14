"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPercent } from "@/utils/formatters";
import { CATEGORICAL_PALETTE, CHART_OTHER_COLOR } from "@/utils/chartColors";
import type { SourceAllocation } from "@/types/milp-results";

const MAX_SLICES = 8;

interface TooltipPayload {
  payload: { name: string; blendRatio: number };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{d.name}</p>
      <p className="mt-0.5 text-ink-muted">{formatPercent(d.blendRatio)}</p>
    </div>
  );
}

/** Blend composition by source, as exact percentages. Direct labels double as CVD relief. */
export function BlendCompositionChart({ sources }: { sources: SourceAllocation[] }) {
  const ranked = [...sources].filter((s) => s.blendRatio > 0).sort((a, b) => b.blendRatio - a.blendRatio);
  if (ranked.length === 0) return null;

  const top = ranked.slice(0, MAX_SLICES);
  const rest = ranked.slice(MAX_SLICES);
  const otherRatio = rest.reduce((sum, s) => sum + s.blendRatio, 0);

  const data = [
    ...top.map((s, i) => ({ name: s.sourceName ?? s.sourceId, blendRatio: s.blendRatio, color: CATEGORICAL_PALETTE[i] })),
    ...(otherRatio > 0 ? [{ name: `Other (${rest.length})`, blendRatio: otherRatio, color: CHART_OTHER_COLOR }] : []),
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-52 w-52 shrink-0 mx-auto sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="blendRatio" nameKey="name" innerRadius="60%" outerRadius="95%" paddingAngle={1.5} stroke="var(--color-surface)" strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5 text-sm min-w-0">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate text-ink">{d.name}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{formatPercent(d.blendRatio)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
