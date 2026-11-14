"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMlPerDay } from "@/utils/formatters";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR } from "@/utils/chartColors";
import type { DemandFulfilment } from "@/types/milp-results";

const DEMAND_COLOR = "#c3ced8"; // target reference — neutral, not a series identity
const DELIVERED_OK_COLOR = "var(--color-primary)";
const DELIVERED_SHORT_COLOR = "var(--color-warning)";

interface TooltipPayload {
  payload: { name: string; demand: number; delivered: number; satisfied: boolean };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{d.name}</p>
      <p className="mt-0.5 text-ink-muted">Demand: {formatMlPerDay(d.demand)}</p>
      <p className="text-ink-muted">Delivered: {formatMlPerDay(d.delivered)}</p>
    </div>
  );
}

/** Is demand being met? Delivered bar turns warning-toned wherever the zone falls short. */
export function DemandFulfilmentChart({ zones }: { zones: DemandFulfilment[] }) {
  if (zones.length === 0) return null;

  const data = zones.map((z) => ({
    name: z.zoneName ?? z.zoneId,
    demand: z.demandMlPerDay,
    delivered: z.deliveredMlPerDay,
    satisfied: z.demandSatisfied ?? z.deliveredMlPerDay >= z.demandMlPerDay,
  }));

  const height = Math.max(200, data.length * 46 + 40);

  return (
    <div>
      <ul className="mb-2 flex gap-4 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEMAND_COLOR }} />
          Demand
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DELIVERED_OK_COLOR }} />
          Delivered
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DELIVERED_SHORT_COLOR }} />
          Delivered (short)
        </li>
      </ul>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barGap={2}>
            <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => formatMlPerDay(v, 0)}
              tick={{ fill: CHART_AXIS_COLOR, fontSize: 11 }}
              axisLine={{ stroke: CHART_GRID_COLOR }}
              tickLine={false}
            />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-sunken)" }} />
            <Bar dataKey="demand" name="Demand" fill={DEMAND_COLOR} radius={[0, 3, 3, 0]} maxBarSize={14} />
            <Bar dataKey="delivered" name="Delivered" radius={[0, 3, 3, 0]} maxBarSize={14}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.satisfied ? DELIVERED_OK_COLOR : DELIVERED_SHORT_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
