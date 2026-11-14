"use client";

/**
 * Polls GET /api/runs/{runId} (the real backend's aggregate endpoint) until
 * the run reaches a terminal workflow status (AquaBlend_Frontend_Final_
 * Integration_Implementation.md §10). Sibling to hooks/useRunPolling.ts
 * (which the legacy /results/* pages still use against the old flat-RunDto
 * contract) rather than a replacement for it, so those pages are unaffected.
 *
 * Polling uses a chained setTimeout (not setInterval) so a slow response
 * never causes two requests to be in flight at once, and only resets
 * `loading` on the very first fetch — later polls update `data` in place so
 * the page never flashes back to a full-page spinner.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getRunAggregate } from "@/services/runApi";
import { toAppError } from "@/services/errorMapping";
import { isTerminalWorkflowStatus } from "@/types/run";
import type { RunAggregateDto } from "@/types/run";
import type { AppError } from "@/types/errors";

// Upper end of the spec's 2-5s range (AquaBlend_Frontend_Final_Integration_
// Implementation.md §10) — deliberately not more aggressive than this: the
// backend currently sits behind a Supabase session pooler with a small
// connection budget shared across every open tab, so a shorter interval
// directly increases the odds of pool exhaustion under concurrent viewers.
const POLL_INTERVAL_MS = 5000;

export interface UseRunAggregateResult {
  data?: RunAggregateDto;
  loading: boolean;
  error?: AppError;
  /** Re-fetches immediately, e.g. from a "Retry" button after a load failure. */
  refresh: () => void;
}

export function useRunAggregate(runId: string): UseRunAggregateResult {
  const [data, setData] = useState<RunAggregateDto | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | undefined>(undefined);

  const triggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // Scoped to THIS effect invocation, not a ref — a ref would be shared
    // across React StrictMode's dev-mode double-invoke of this effect, so
    // the first (soon-to-be-cancelled) invocation's in-flight request would
    // permanently block the second (surviving) invocation's very first
    // poll(), leaving the component stuck on `loading` forever with no
    // fetch, no error, and nothing in the console. A plain local flag avoids
    // that: each effect invocation only ever guards its own poll chain.
    let inFlight = false;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await getRunAggregate(runId);
        if (cancelled) return;
        setData(next);
        setLoading(false);
        setError(undefined);
        if (!isTerminalWorkflowStatus(next.run.status)) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setError(toAppError(err));
      } finally {
        inFlight = false;
      }
    }

    triggerRef.current = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      void poll();
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [runId]);

  const refresh = useCallback(() => {
    triggerRef.current();
  }, []);

  return { data, loading, error, refresh };
}
