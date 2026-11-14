import clsx from "clsx";
import type { StatusTone } from "@/utils/resultStatus";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  info: "bg-primary-soft text-primary-hover",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

const dotClasses: Record<StatusTone, string> = {
  neutral: "bg-ink-faint",
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export interface StatusPillProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

/**
 * The label text is always the real non-colour signal (layout.md §21) — the
 * dot is a purely decorative accent, not a substitute for it.
 */
export function StatusPill({ label, tone, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={clsx("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
      {label}
    </span>
  );
}
