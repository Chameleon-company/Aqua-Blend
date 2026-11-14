"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { SYSTEM_FLOW_EDGES, SYSTEM_FLOW_NODES } from "./systemFlowData";

interface Rect {
  top: number;
  left: number;
  right: number;
  centerY: number;
}

const ROW_HEIGHT = 92;

function bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

export function SystemFlowGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [rects, setRects] = useState<Map<string, Rect>>(new Map());
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const columns = useMemo(() => {
    const byCol = new Map<number, typeof SYSTEM_FLOW_NODES>();
    for (const node of SYSTEM_FLOW_NODES) {
      const list = byCol.get(node.col) ?? [];
      list.push(node);
      byCol.set(node.col, list);
    }
    const count = Math.max(...SYSTEM_FLOW_NODES.map((n) => n.col)) + 1;
    return Array.from({ length: count }, (_, i) => (byCol.get(i) ?? []).sort((a, b) => a.row - b.row));
  }, []);

  const maxRows = Math.max(...columns.map((c) => c.length), 1);
  const height = maxRows * ROW_HEIGHT + 16;

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
  }, []);

  const active = hovered ?? selected;

  const activeSet = useMemo(() => {
    if (!active) return null;
    const nodes = new Set([active]);
    const edges = new Set<string>();
    for (const edge of SYSTEM_FLOW_EDGES) {
      if (edge.from === active || edge.to === active) {
        edges.add(`${edge.from}→${edge.to}`);
        nodes.add(edge.from);
        nodes.add(edge.to);
      }
    }
    return { nodes, edges };
  }, [active]);

  const selectedNode = SYSTEM_FLOW_NODES.find((n) => n.id === selected);
  const inputs = selected ? SYSTEM_FLOW_EDGES.filter((e) => e.to === selected).map((e) => e.from) : [];
  const outputs = selected ? SYSTEM_FLOW_EDGES.filter((e) => e.from === selected).map((e) => e.to) : [];

  const edgePaths: ReactNode[] = [];
  for (const edge of SYSTEM_FLOW_EDGES) {
    const from = rects.get(edge.from);
    const to = rects.get(edge.to);
    if (!from || !to) continue;
    const key = `${edge.from}→${edge.to}`;
    const isActiveEdge = !active || activeSet?.edges.has(key);
    const midX = (from.right + to.left) / 2;
    const d = `M ${from.right} ${from.centerY} C ${midX} ${from.centerY}, ${midX} ${to.centerY}, ${to.left - 6} ${to.centerY}`;
    const arrowX = bezierPoint(from.right, midX, midX, to.left - 6, 0.98);
    const arrowY = bezierPoint(from.centerY, from.centerY, to.centerY, to.centerY, 0.98);
    edgePaths.push(
      <g key={key} className={clsx(!isActiveEdge && "opacity-15")}>
        <path
          d={d}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={active && activeSet?.edges.has(key) ? 3 : 1.75}
          strokeLinecap="round"
        />
        <circle cx={arrowX} cy={arrowY} r={2.5} fill="var(--color-accent)" />
      </g>,
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative grid gap-6 overflow-x-auto"
        style={{ height, gridTemplateColumns: `repeat(${columns.length}, minmax(7.5rem, 1fr))` }}
        role="img"
        aria-label="System architecture graph from data science through to the operator. An accessible list equivalent follows below."
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {edgePaths}
        </svg>

        {columns.map((nodes, colIndex) => (
          <div key={colIndex} className="relative z-10 flex flex-col justify-around gap-2">
            {nodes.map((node) => {
              const isActive = !active || activeSet?.nodes.has(node.id);
              const isSelected = selected === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  ref={(el) => {
                    if (el) nodeRefs.current.set(node.id, el);
                    else nodeRefs.current.delete(node.id);
                  }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(node.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected((current) => (current === node.id ? null : node.id))}
                  className={clsx(
                    "w-full rounded-sm border px-3 py-2.5 text-left text-xs transition-opacity focus-visible:outline-2 focus-visible:outline-primary",
                    isSelected ? "border-primary bg-primary-soft" : "border-border-strong bg-surface",
                    !isActive && "opacity-30",
                  )}
                >
                  <div className="font-medium text-ink">{node.label}</div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div aria-live="polite" className="mt-4 min-h-24 border border-border rounded-sm p-4">
        {selectedNode ? (
          <div>
            <h3 className="text-sm font-semibold text-ink">{selectedNode.label}</h3>
            <p className="mt-1 text-sm text-ink-muted">{selectedNode.description}</p>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-xs text-ink-faint">
              <div>
                <dt className="inline font-medium">Receives from: </dt>
                <dd className="inline">{inputs.length ? inputs.join(", ") : "Nothing upstream"}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Sends to: </dt>
                <dd className="inline">{outputs.length ? outputs.join(", ") : "Nothing downstream"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Hover or select a node to see what it does and how it connects.</p>
        )}
      </div>
    </div>
  );
}
