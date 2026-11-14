import clsx from "clsx";

export interface DemandBarProps {
  demand: number;
  delivered: number;
}

/** Decorative delivered-vs-demand indicator — numeric values are always shown alongside. */
export function DemandBar({ demand, delivered }: DemandBarProps) {
  if (demand <= 0) return null;
  const percent = Math.min(100, (delivered / demand) * 100);
  const short = delivered < demand;

  return (
    <div aria-hidden="true" className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
      <div
        className={clsx("h-full rounded-full", short ? "bg-warning" : "bg-success")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
