import { Button } from "@/components/ui/Button";

export interface FailedStateProps {
  message: string;
  detail?: string;
  onRetry?: () => void;
}

/** layout.md §17.7 — error state, retry control, user-readable message. */
export function FailedState({ message, detail, onRetry }: FailedStateProps) {
  return (
    <div role="alert" className="border border-danger-soft bg-danger-soft/60 rounded-sm p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-danger">Optimisation failed</p>
      <h2 className="mt-1 text-xl font-semibold text-ink">{message}</h2>
      {detail ? (
        <details className="mt-3 text-sm text-ink-muted">
          <summary className="cursor-pointer">Technical detail</summary>
          <p className="mt-2 font-mono text-xs">{detail}</p>
        </details>
      ) : null}
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
