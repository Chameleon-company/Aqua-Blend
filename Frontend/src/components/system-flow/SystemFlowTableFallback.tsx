import { SYSTEM_FLOW_EDGES, SYSTEM_FLOW_NODES } from "./systemFlowData";

/** Always-rendered accessible equivalent of SystemFlowGraph. */
export function SystemFlowTableFallback() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Components</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          {SYSTEM_FLOW_NODES.map((node) => (
            <div key={node.id} className="border border-border rounded-sm p-3">
              <dt className="text-sm font-medium text-ink">{node.label}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{node.description}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Connections</h3>
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">Directed connections between system components</caption>
          <thead>
            <tr className="border-b border-border-strong text-left">
              <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                From
              </th>
              <th scope="col" className="py-2 px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                To
              </th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_FLOW_EDGES.map((edge) => {
              const fromLabel = SYSTEM_FLOW_NODES.find((n) => n.id === edge.from)?.label ?? edge.from;
              const toLabel = SYSTEM_FLOW_NODES.find((n) => n.id === edge.to)?.label ?? edge.to;
              return (
                <tr key={`${edge.from}-${edge.to}`} className="border-b border-border">
                  <td className="py-2 px-3">{fromLabel}</td>
                  <td className="py-2 px-3">{toLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
