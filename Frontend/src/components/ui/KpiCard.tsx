import type { ReactNode } from "react";
import clsx from "clsx";
import type { StatusTone } from "@/utils/resultStatus";

const toneClasses: Record<StatusTone, string> = {
  neutral: "text-ink-faint",
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  icon?: ReactNode;
  tone?: StatusTone;
  tooltip?: string;
}

/** Restrained metric tile: label, one strong value, optional secondary context. No paragraphs. */
export function KpiCard({ label, value, secondary, icon, tone = "neutral", tooltip }: KpiCardProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
        {icon ? <span className={clsx("shrink-0", toneClasses[tone])}>{icon}</span> : null}
      </div>
      <dd className="mt-2 text-2xl font-semibold tabular-nums text-ink leading-none">{value}</dd>
      {secondary ? <div className="mt-2 text-xs text-ink-muted">{secondary}</div> : null}
      {tooltip ? <p className="sr-only">{tooltip}</p> : null}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{children}</dl>;
}
