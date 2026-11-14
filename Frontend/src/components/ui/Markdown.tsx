import Markdown from "markdown-to-jsx";
import clsx from "clsx";

const options = {
  overrides: {
    h1: { component: "h3", props: { className: "mt-6 first:mt-0 text-base font-semibold text-ink" } },
    h2: { component: "h3", props: { className: "mt-6 first:mt-0 text-base font-semibold text-ink" } },
    h3: { component: "h4", props: { className: "mt-5 first:mt-0 text-sm font-semibold text-ink" } },
    h4: { component: "h4", props: { className: "mt-4 first:mt-0 text-sm font-semibold text-ink" } },
    p: { props: { className: "mt-3 first:mt-0 text-sm leading-relaxed text-ink-muted" } },
    ul: { props: { className: "mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-muted" } },
    ol: { props: { className: "mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-muted" } },
    li: { props: { className: "leading-relaxed" } },
    strong: { props: { className: "font-semibold text-ink" } },
    a: { props: { className: "text-primary underline underline-offset-2", target: "_blank", rel: "noreferrer" } },
    hr: { props: { className: "my-4 border-border" } },
    code: { props: { className: "rounded-xs bg-surface-sunken px-1 py-0.5 font-mono text-xs text-ink" } },
    blockquote: { props: { className: "mt-3 border-l-2 border-border-strong pl-3 text-sm text-ink-muted italic" } },
  },
} as const;

export interface MarkdownContentProps {
  children: string;
  className?: string;
}

/**
 * Renders AI-generated report Markdown (`## Scenario & Solver Status`, etc.)
 * as structured, scannable content instead of one raw-text blob. The AI
 * output stays the source of truth for wording — this only formats it
 * (Part 25: frontend is presentation, not generation).
 */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={clsx("max-w-prose", className)}>
      <Markdown options={options}>{children}</Markdown>
    </div>
  );
}
