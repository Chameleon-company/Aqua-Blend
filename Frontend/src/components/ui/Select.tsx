import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-sm border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-ink",
        "focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
