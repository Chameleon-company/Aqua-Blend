"use client";

/** Centralized stress-test list + polling for /runs/[runId]/stress-testing. */
import { useCallback, useEffect, useState } from "react";
import { createStressTest, getRunStressTests, getStressTest } from "@/services/stressTestApi";
import { toAppError } from "@/services/errorMapping";
import type { StressTestConfig, StressTestResult } from "@/types/stress-test";
import type { AppError } from "@/types/errors";

const POLL_INTERVAL_MS = 600;

export interface UseStressTestsResult {
  tests: StressTestResult[];
  loading: boolean;
  error?: AppError;
  creating: boolean;
  createError?: AppError;
  create: (config: StressTestConfig) => Promise<void>;
}

export function useStressTests(runId: string): UseStressTestsResult {
  const [tests, setTests] = useState<StressTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<AppError | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getRunStressTests(runId)
      .then(async (summaries) => {
        const resolved = await Promise.all(summaries.map((s) => getStressTest(s.stressTestId)));
        if (!cancelled) {
          setTests(resolved);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(toAppError(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  useEffect(() => {
    const incomplete = tests.filter((t) => t.status === "queued" || t.status === "running");
    if (incomplete.length === 0) return;
    const interval = setInterval(() => {
      Promise.all(incomplete.map((t) => getStressTest(t.stressTestId))).then((updated) => {
        setTests((prev) => prev.map((t) => updated.find((u) => u.stressTestId === t.stressTestId) ?? t));
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tests]);

  const create = useCallback(
    async (config: StressTestConfig) => {
      setCreating(true);
      setCreateError(undefined);
      try {
        const summary = await createStressTest(runId, config);
        const full = await getStressTest(summary.stressTestId);
        setTests((prev) => [full, ...prev]);
      } catch (err) {
        setCreateError(toAppError(err));
      } finally {
        setCreating(false);
      }
    },
    [runId],
  );

  return { tests, loading, error, creating, createError, create };
}
