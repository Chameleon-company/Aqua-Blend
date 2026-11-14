"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMlPerDay, formatPercent } from "@/utils/formatters";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR, SEQUENTIAL_BLUE } from "@/utils/chartColors";
import type { SourceAllocation } from "@/types/milp-results";

interface TooltipPayload {
  payload: { name: string; withdrawal: number; blendRatio: number };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{d.name}</p>
      <p className="mt-0.5 text-ink-muted">{formatMlPerDay(d.withdrawal)}</p>
      <p className="text-ink-faint">{formatPercent(d.blendRatio)} of blend</p>
    </div>
  );
}

/** Which sources provide the most water? One series (magnitude), so one hue throughout. */
export function SourceAllocationChart({ sources }: { sources: SourceAllocation[] }) {
  const data = [...sources]
    .filter((s) => s.withdrawalMlPerDay > 0)
    .sort((a, b) => b.withdrawalMlPerDay - a.withdrawalMlPerDay)
    .map((s) => ({
      name: s.sourceName ?? s.sourceId,
      withdrawal: s.withdrawalMlPerDay,
      blendRatio: s.blendRatio,
    }));

  if (data.length === 0) return null;

  const height = Math.max(160, data.length * 34 + 24);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatMlPerDay(v, 0)}
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
            axisLine={{ stroke: CHART_GRID_COLOR }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-sunken)" }} />
          <Bar dataKey="withdrawal" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((_, index) => (
              <Cell key={index} fill={SEQUENTIAL_BLUE[500]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
