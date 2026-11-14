import type { ReactNode } from "react";
import clsx from "clsx";

export interface SectionProps {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Sections needing distinct treatment, e.g. AI Explanation: layout.md §15.3. */
  tone?: "default" | "accent";
}

/**
 * The shared section shell used down the whole /optimise and /results/[id]
 * page: a continuous bordered stack, not floating cards
 * (AquaBlend_frontend_layout.md §7.1 / §29).
 */
export function Section({ id, title, description, action, children, className, tone = "default" }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={clsx(
        "py-8",
        tone === "accent"
          ? "bg-linear-to-br from-accent-soft to-primary-soft/40 -mx-6 px-6 rounded-sm border-l-2 border-l-accent my-2"
          : "border-t border-border first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <div>
          <h2 id={id ? `${id}-heading` : undefined} className="text-lg font-semibold text-ink tracking-tight">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-ink-muted max-w-2xl">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
