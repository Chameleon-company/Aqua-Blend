import type { ReactNode } from "react";

export interface PageHeadingProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {action}
      </div>
      <div className="mt-3 h-0.5 w-12 rounded-full bg-linear-to-r from-primary to-accent" />
      {description ? <p className="mt-3 text-sm text-ink-muted max-w-2xl">{description}</p> : null}
    </div>
  );
}
