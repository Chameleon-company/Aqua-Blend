import { Collapsible } from "@/components/ui/Collapsible";
import { formatMlPerDay } from "@/utils/formatters";
import type { NetworkLinkRef } from "@/types/reference-data";
import type { NetworkOverride, NetworkOverrideKind } from "@/types/scenario";

export interface AdvancedNetworkOverridesProps {
  overrides: NetworkOverride[];
  networkLinkRefs: NetworkLinkRef[];
  onChange: (next: NetworkOverride[]) => void;
}

type Mode = "normal" | "outage" | "capacity";

function modeFor(kind: NetworkOverrideKind): Mode {
  return kind === "capacity_override" ? "capacity" : "outage";
}

function outageKindFor(link: NetworkLinkRef): NetworkOverrideKind {
  return link.kind === "source_to_plant" ? "source_plant_outage" : "plant_zone_outage";
}

/**
 * Physical network topology is backend/Supabase-owned and not a generic
 * free-form editor — this only exposes simulating an outage or overriding
 * capacity on an existing physical link. Default is "use current network
 * configuration" (no override entry for a link).
 */
export function AdvancedNetworkOverrides({ overrides, networkLinkRefs, onChange }: AdvancedNetworkOverridesProps) {
  function setMode(link: NetworkLinkRef, mode: Mode) {
    const withoutLink = overrides.filter((o) => o.linkId !== link.linkId);
    if (mode === "normal") {
      onChange(withoutLink);
    } else if (mode === "outage") {
      onChange([...withoutLink, { linkId: link.linkId, kind: outageKindFor(link) }]);
    } else {
      onChange([...withoutLink, { linkId: link.linkId, kind: "capacity_override", capacityOverrideMlPerDay: link.defaultCapacityMlPerDay ?? 0 }]);
    }
  }

  function setCapacity(link: NetworkLinkRef, capacity: number) {
    onChange(overrides.map((o) => (o.linkId === link.linkId ? { ...o, capacityOverrideMlPerDay: capacity } : o)));
  }

  return (
    <Collapsible summary="Advanced: network outage / capacity overrides" defaultOpen={overrides.length > 0}>
      <p className="text-xs text-ink-faint mb-4">
        Physical connections are fixed by the network topology. Use this only to simulate an outage or a reduced
        capacity on an existing link — the MILP still decides actual flow.
      </p>
      <div className="flex flex-col gap-3">
        {networkLinkRefs.map((link) => {
          const override = overrides.find((o) => o.linkId === link.linkId);
          const mode: Mode = !override ? "normal" : modeFor(override.kind);
          return (
            <div key={link.linkId} className="flex flex-wrap items-center gap-3 border border-border rounded-sm p-3 text-sm">
              <div className="min-w-[14rem]">
                <span className="font-mono text-xs text-ink-faint">{link.fromName ?? link.fromId}</span>
                <span className="mx-1 text-ink-faint">→</span>
                <span className="font-mono text-xs text-ink-faint">{link.toName ?? link.toId}</span>
                {link.defaultCapacityMlPerDay !== undefined ? (
                  <p className="text-xs text-ink-faint">Default capacity: {formatMlPerDay(link.defaultCapacityMlPerDay)}</p>
                ) : null}
              </div>
              <select
                value={mode}
                onChange={(e) => setMode(link, e.target.value as Mode)}
                className="rounded-sm border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-ink"
              >
                <option value="normal">Use current configuration</option>
                <option value="outage">Simulate outage</option>
                <option value="capacity">Override capacity</option>
              </select>
              {mode === "capacity" ? (
                <input
                  type="number"
                  min={0}
                  value={override?.capacityOverrideMlPerDay ?? ""}
                  onChange={(e) => setCapacity(link, Number(e.target.value))}
                  className="w-28 rounded-sm border border-border-strong bg-surface px-2 py-1 text-xs text-ink"
                  aria-label={`Override capacity for ${link.fromName ?? link.fromId} to ${link.toName ?? link.toId}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}
