"use client";

import { Info } from "lucide-react";

/**
 * Minimal, dependency-free tooltip for technical terms (Solver Status,
 * Utilisation, Constraint Slack, ...). CSS-only show/hide keeps it keyboard
 * and screen-reader accessible without pulling in a popover library.
 */
export function InfoTooltip({ label }: { label: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex text-ink-faint hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-primary rounded-full"
        aria-label={label}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1.5 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
