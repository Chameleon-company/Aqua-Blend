"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { formatMlPerDay } from "@/utils/formatters";
import type {
  DemandFulfilment,
  PlantUtilisation,
  PlantZoneFlow,
  SourcePlantFlow,
  SourceAllocation,
} from "@/types/milp-results";

type NodeKind = "source" | "plant" | "zone";

export interface NetworkTarget {
  kind: NodeKind | "spEdge" | "pzEdge";
  id: string;
}

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerY: number;
}

export interface NetworkGraphProps {
  sources: SourceAllocation[];
  plants: PlantUtilisation[];
  zones: DemandFulfilment[];
  sourceToPlantFlows: SourcePlantFlow[];
  plantToZoneFlows: PlantZoneFlow[];
  onSelect?: (target: NetworkTarget | null) => void;
}

const ROW_HEIGHT = 56;

function edgeKey(a: string, b: string): string {
  return `${a}→${b}`;
}

function strokeWidth(flow: number, maxFlow: number): number {
  const min = 1.5;
  const max = 8;
  if (maxFlow <= 0) return min;
  return min + (flow / maxFlow) * (max - min);
}

function bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/** Spreads labels along their curves so edges converging on the same node don't stack their text. */
const LABEL_LANES = [0.5, 0.32, 0.68, 0.4, 0.6];

/** Halo behind the fill so a label stays legible over crossing lines and other labels. */
function EdgeLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        className="text-[10px] font-medium"
        stroke="var(--color-surface)"
        strokeWidth={4}
        strokeLinejoin="round"
        fill="var(--color-surface)"
        pointerEvents="none"
      >
        {children}
      </text>
      <text x={x} y={y} textAnchor="middle" className="fill-ink text-[10px] font-medium" pointerEvents="none">
        {children}
      </text>
    </>
  );
}

export function NetworkGraph({ sources, plants, zones, sourceToPlantFlows, plantToZoneFlows, onSelect }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [rects, setRects] = useState<Map<string, Rect>>(new Map());
  const [hovered, setHovered] = useState<NetworkTarget | null>(null);
  const [selected, setSelected] = useState<NetworkTarget | null>(null);

  const maxSpFlow = useMemo(() => Math.max(1, ...sourceToPlantFlows.map((f) => f.flowMlPerDay)), [sourceToPlantFlows]);
  const maxPzFlow = useMemo(() => Math.max(1, ...plantToZoneFlows.map((f) => f.flowMlPerDay)), [plantToZoneFlows]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const containerRect = container!.getBoundingClientRect();
      const next = new Map<string, Rect>();
      nodeRefs.current.forEach((el, key) => {
        const r = el.getBoundingClientRect();
        next.set(key, {
          top: r.top - containerRect.top,
          bottom: r.bottom - containerRect.top,
          left: r.left - containerRect.left,
          right: r.right - containerRect.left,
          centerY: r.top - containerRect.top + r.height / 2,
        });
      });
      setRects(next);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [sources.length, plants.length, zones.length]);

  function registerNode(key: string, el: HTMLElement | null) {
    if (el) nodeRefs.current.set(key, el);
    else nodeRefs.current.delete(key);
  }

  const active = hovered ?? selected;

  const activeSets = useMemo(() => {
    const nodes = new Set<string>();
    const spEdges = new Set<string>();
    const pzEdges = new Set<string>();
    if (!active) return { nodes, spEdges, pzEdges };

    if (active.kind === "source") {
      nodes.add(`source:${active.id}`);
      for (const f of sourceToPlantFlows) {
        if (f.sourceId === active.id) {
          spEdges.add(edgeKey(f.sourceId, f.plantId));
          nodes.add(`plant:${f.plantId}`);
          for (const g of plantToZoneFlows) {
            if (g.plantId === f.plantId) {
              pzEdges.add(edgeKey(g.plantId, g.zoneId));
              nodes.add(`zone:${g.zoneId}`);
            }
          }
        }
      }
    } else if (active.kind === "plant") {
      nodes.add(`plant:${active.id}`);
      for (const f of sourceToPlantFlows) {
        if (f.plantId === active.id) {
          spEdges.add(edgeKey(f.sourceId, f.plantId));
          nodes.add(`source:${f.sourceId}`);
        }
      }
      for (const g of plantToZoneFlows) {
        if (g.plantId === active.id) {
          pzEdges.add(edgeKey(g.plantId, g.zoneId));
          nodes.add(`zone:${g.zoneId}`);
        }
      }
    } else if (active.kind === "zone") {
      nodes.add(`zone:${active.id}`);
      for (const g of plantToZoneFlows) {
        if (g.zoneId === active.id) {
          pzEdges.add(edgeKey(g.plantId, g.zoneId));
          nodes.add(`plant:${g.plantId}`);
          for (const f of sourceToPlantFlows) {
            if (f.plantId === g.plantId) {
              spEdges.add(edgeKey(f.sourceId, f.plantId));
              nodes.add(`source:${f.sourceId}`);
            }
          }
        }
      }
    } else if (active.kind === "spEdge") {
      spEdges.add(active.id);
      const [s, p] = active.id.split("→");
      nodes.add(`source:${s}`);
      nodes.add(`plant:${p}`);
    } else if (active.kind === "pzEdge") {
      pzEdges.add(active.id);
      const [p, z] = active.id.split("→");
      nodes.add(`plant:${p}`);
      nodes.add(`zone:${z}`);
    }
    return { nodes, spEdges, pzEdges };
  }, [active, sourceToPlantFlows, plantToZoneFlows]);

  function select(target: NetworkTarget) {
    const isSame = selected?.kind === target.kind && selected?.id === target.id;
    const next = isSame ? null : target;
    setSelected(next);
    onSelect?.(next);
  }

  const height = Math.max(sources.length, plants.length, zones.length, 1) * ROW_HEIGHT + 16;

  function Node({ nodeKey, kind, id, title, subtitle }: { nodeKey: string; kind: NodeKind; id: string; title: string; subtitle?: string }) {
    const isActive = !active || activeSets.nodes.has(nodeKey);
    const isSelected = selected?.kind === kind && selected?.id === id;
    return (
      <button
        type="button"
        ref={(el) => registerNode(nodeKey, el)}
        onMouseEnter={() => setHovered({ kind, id })}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered({ kind, id })}
        onBlur={() => setHovered(null)}
        onClick={() => select({ kind, id })}
        className={clsx(
          "w-full rounded-sm border px-3 py-2 text-left text-xs transition-opacity focus-visible:outline-2 focus-visible:outline-primary",
          isSelected ? "border-primary bg-primary-soft" : "border-border-strong bg-surface",
          !isActive && "opacity-30",
        )}
      >
        <div className="font-medium text-ink truncate">{title}</div>
        {subtitle ? <div className="text-ink-faint truncate">{subtitle}</div> : null}
      </button>
    );
  }

  const spPaths: ReactNode[] = [];
  sourceToPlantFlows.forEach((flow, index) => {
    const from = rects.get(`source:${flow.sourceId}`);
    const to = rects.get(`plant:${flow.plantId}`);
    if (!from || !to) return;
    const key = edgeKey(flow.sourceId, flow.plantId);
    const isActiveEdge = !active || activeSets.spEdges.has(key);
    const midX = (from.right + to.left) / 2;
    const d = `M ${from.right} ${from.centerY} C ${midX} ${from.centerY}, ${midX} ${to.centerY}, ${to.left} ${to.centerY}`;
    const t = LABEL_LANES[index % LABEL_LANES.length];
    const labelX = bezierPoint(from.right, midX, midX, to.left, t);
    const labelY = bezierPoint(from.centerY, from.centerY, to.centerY, to.centerY, t) - 8;
    spPaths.push(
      <g key={key} className={clsx(!isActiveEdge && "opacity-20")}>
        <path
          d={d}
          fill="none"
          stroke={flow.isActive ? "var(--color-primary)" : "var(--color-border-strong)"}
          strokeWidth={strokeWidth(flow.flowMlPerDay, maxSpFlow)}
          strokeLinecap="round"
          className="cursor-pointer"
          pointerEvents="stroke"
          onMouseEnter={() => setHovered({ kind: "spEdge", id: key })}
          onMouseLeave={() => setHovered(null)}
          onClick={() => select({ kind: "spEdge", id: key })}
        />
        <EdgeLabel x={labelX} y={labelY}>{formatMlPerDay(flow.flowMlPerDay, 1)}</EdgeLabel>
      </g>,
    );
  });

  const pzPaths: ReactNode[] = [];
  plantToZoneFlows.forEach((flow, index) => {
    const from = rects.get(`plant:${flow.plantId}`);
    const to = rects.get(`zone:${flow.zoneId}`);
    if (!from || !to) return;
    const key = edgeKey(flow.plantId, flow.zoneId);
    const isActiveEdge = !active || activeSets.pzEdges.has(key);
    const midX = (from.right + to.left) / 2;
    const d = `M ${from.right} ${from.centerY} C ${midX} ${from.centerY}, ${midX} ${to.centerY}, ${to.left} ${to.centerY}`;
    const t = LABEL_LANES[index % LABEL_LANES.length];
    const labelX = bezierPoint(from.right, midX, midX, to.left, t);
    const labelY = bezierPoint(from.centerY, from.centerY, to.centerY, to.centerY, t) - 8;
    pzPaths.push(
      <g key={key} className={clsx(!isActiveEdge && "opacity-20")}>
        <path
          d={d}
          fill="none"
          stroke={flow.isActive ? "var(--color-accent)" : "var(--color-border-strong)"}
          strokeWidth={strokeWidth(flow.flowMlPerDay, maxPzFlow)}
          strokeLinecap="round"
          className="cursor-pointer"
          pointerEvents="stroke"
          onMouseEnter={() => setHovered({ kind: "pzEdge", id: key })}
          onMouseLeave={() => setHovered(null)}
          onClick={() => select({ kind: "pzEdge", id: key })}
        />
        <EdgeLabel x={labelX} y={labelY}>{formatMlPerDay(flow.flowMlPerDay, 1)}</EdgeLabel>
      </g>,
    );
  });

  return (
    <div
      ref={containerRef}
      className="relative grid grid-cols-3 gap-16"
      style={{ height }}
      role="img"
      aria-label="Network flow diagram from sources through treatment plants to demand zones. An accessible table equivalent follows below."
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {spPaths}
        {pzPaths}
      </svg>

      <div className="relative z-10 flex flex-col justify-around gap-2">
        {sources.map((s) => (
          <Node key={s.sourceId} nodeKey={`source:${s.sourceId}`} kind="source" id={s.sourceId} title={s.sourceName ?? s.sourceId} subtitle={formatMlPerDay(s.withdrawalMlPerDay, 1)} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col justify-around gap-2">
        {plants.map((p) => (
          <Node key={p.plantId} nodeKey={`plant:${p.plantId}`} kind="plant" id={p.plantId} title={p.plantName ?? p.plantId} subtitle={formatMlPerDay(p.throughputMlPerDay, 1)} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col justify-around gap-2">
        {zones.map((z) => (
          <Node key={z.zoneId} nodeKey={`zone:${z.zoneId}`} kind="zone" id={z.zoneId} title={z.zoneName ?? z.zoneId} subtitle={formatMlPerDay(z.deliveredMlPerDay, 1)} />
        ))}
      </div>
    </div>
  );
}
