import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx("animate-pulse rounded-sm bg-surface-sunken", className)} />;
}

export function TableSkeleton({ rows = 4, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading results" className="flex flex-col gap-2">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div role="status" aria-label="Loading summary" className="flex flex-wrap gap-8">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
