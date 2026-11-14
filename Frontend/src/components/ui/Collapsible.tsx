import type { ReactNode } from "react";

export interface CollapsibleProps {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** Native <details>/<summary> gives keyboard + screen-reader support for free. */
export function Collapsible({ summary, children, defaultOpen = false }: CollapsibleProps) {
  return (
    <details open={defaultOpen} className="group border-t border-border py-4">
      <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:content-none focus-visible:outline-2 focus-visible:outline-primary flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-0 w-0 border-y-[4px] border-y-transparent border-l-[5px] border-l-ink-faint transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}
