"use client";

import { useState } from "react";
import { NetworkGraph, type NetworkTarget } from "./NetworkGraph";
import { NetworkTableFallback } from "./NetworkTableFallback";
import { formatMlPerDay } from "@/utils/formatters";
import type { MilpResultViewModel } from "@/types/milp-results";

function DetailPanel({ target, result }: { target: NetworkTarget; result: MilpResultViewModel }) {
  if (target.kind === "spEdge") {
    const [sourceId, plantId] = target.id.split("→");
    const flow = result.sourceToPlantFlows.find((f) => f.sourceId === sourceId && f.plantId === plantId);
    if (!flow) return null;
    return (
      <p>
        <span className="font-mono">{sourceId}</span> → <span className="font-mono">{plantId}</span>:{" "}
        {formatMlPerDay(flow.flowMlPerDay)}
        {flow.maxFlowMlPerDay !== undefined ? ` of ${formatMlPerDay(flow.maxFlowMlPerDay)} max` : ""}
      </p>
    );
  }
  if (target.kind === "pzEdge") {
    const [plantId, zoneId] = target.id.split("→");
    const flow = result.plantToZoneFlows.find((f) => f.plantId === plantId && f.zoneId === zoneId);
    if (!flow) return null;
    return (
      <p>
        <span className="font-mono">{plantId}</span> → <span className="font-mono">{zoneId}</span>:{" "}
        {formatMlPerDay(flow.flowMlPerDay)}
        {flow.maxFlowMlPerDay !== undefined ? ` of ${formatMlPerDay(flow.maxFlowMlPerDay)} max` : ""}
      </p>
    );
  }
  if (target.kind === "plant") {
    const plant = result.plants.find((p) => p.plantId === target.id);
    if (!plant) return null;
    return (
      <p>
        <span className="font-mono">{plant.plantId}</span> throughput {formatMlPerDay(plant.throughputMlPerDay)}
      </p>
    );
  }
  if (target.kind === "zone") {
    const zone = result.demandZones.find((z) => z.zoneId === target.id);
    if (!zone) return null;
    return (
      <p>
        <span className="font-mono">{zone.zoneId}</span> demand {formatMlPerDay(zone.demandMlPerDay)}, delivered{" "}
        {formatMlPerDay(zone.deliveredMlPerDay)}
      </p>
    );
  }
  return <p className="font-mono">{target.id}</p>;
}

export function NetworkResults({ result }: { result: MilpResultViewModel }) {
  const [selected, setSelected] = useState<NetworkTarget | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Flow diagram</h3>
        <p className="text-xs text-ink-faint mb-3">
          Hover or focus a node or connection to trace its path. Click to pin a selection.
        </p>
        <div className="border border-border rounded-sm p-4">
          <NetworkGraph
            sources={result.selectedSources}
            plants={result.plants}
            zones={result.demandZones}
            sourceToPlantFlows={result.sourceToPlantFlows}
            plantToZoneFlows={result.plantToZoneFlows}
            onSelect={setSelected}
          />
        </div>
        <div aria-live="polite" className="mt-2 min-h-6 text-sm text-ink">
          {selected ? <DetailPanel target={selected} result={result} /> : null}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Flow detail (accessible table)</h3>
        <NetworkTableFallback sourceToPlantFlows={result.sourceToPlantFlows} plantToZoneFlows={result.plantToZoneFlows} />
      </div>
    </div>
  );
}
