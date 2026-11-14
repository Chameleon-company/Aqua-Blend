import type { ReactNode } from "react";
import clsx from "clsx";

export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
}

/** The one bordered-surface container every panel in the analysis workspace uses. */
export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-md border border-border bg-surface",
        padding === "md" && "p-5 sm:p-6",
        padding === "sm" && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, icon, className }: CardHeaderProps) {
  return (
    <div className={clsx("flex flex-wrap items-start justify-between gap-3 mb-4", className)}>
      <div className="flex items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-ink-faint shrink-0">{icon}</span> : null}
        <div>
          <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-ink-muted max-w-md">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
