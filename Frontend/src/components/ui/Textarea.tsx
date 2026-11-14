import type { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-sm border border-border-strong bg-surface px-3.5 py-3 text-sm text-ink",
        "placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-primary",
        "resize-y min-h-24",
        className,
      )}
      {...props}
    />
  );
}
