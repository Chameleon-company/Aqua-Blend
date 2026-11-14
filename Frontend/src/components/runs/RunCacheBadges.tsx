import { StatusPill } from "@/components/ui/StatusPill";

export interface RunCacheBadgesProps {
  forceRerun?: boolean;
  milpCacheHit?: boolean;
  aiCacheHit?: boolean;
  isLegacyFallback?: boolean;
}

/**
 * Secondary cache/re-run metadata (AquaBlend_Frontend_Final_Integration_
 * Implementation.md §11) — deliberately rendered separately from RunStatus's
 * main workflow-status pill, never as a substitute for it. Renders nothing
 * when no flag applies, so it is always safe to include unconditionally.
 */
export function RunCacheBadges({ forceRerun, milpCacheHit, aiCacheHit, isLegacyFallback }: RunCacheBadgesProps) {
  const hasAny = forceRerun || milpCacheHit || aiCacheHit || isLegacyFallback;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {milpCacheHit ? <StatusPill label="Optimisation result reused" tone="info" /> : null}
      {forceRerun ? <StatusPill label="Forced re-run" tone="warning" /> : null}
      {aiCacheHit ? <StatusPill label="AI analysis reused" tone="info" /> : null}
      {isLegacyFallback ? <StatusPill label="Legacy result" tone="neutral" /> : null}
    </div>
  );
}
