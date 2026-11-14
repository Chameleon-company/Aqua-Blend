"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useInView } from "@/hooks/useInView";
import { ReducedMotionFallback } from "./ReducedMotionFallback";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

const WaterCanvas = dynamic(() => import("./WaterCanvas"), {
  ssr: false,
  loading: () => <ReducedMotionFallback />,
});

/**
 * The animated dotted-water hero — AquaBlend's key identity element
 * (AquaBlend_frontend_layout.md §4). Falls back to a static dot pattern for
 * `prefers-reduced-motion`, while off-screen the WebGL canvas pauses its
 * render loop rather than unmounting (cheaper to resume).
 */
export function DottedWater() {
  const reducedMotion = useReducedMotion();
  const [containerRef, inView] = useInView<HTMLDivElement>();

  return (
    <div ref={containerRef} className="h-full w-full">
      {reducedMotion ? (
        <ReducedMotionFallback />
      ) : (
        <CanvasErrorBoundary fallback={<ReducedMotionFallback />}>
          <Suspense fallback={<ReducedMotionFallback />}>
            <WaterCanvas active={inView} />
          </Suspense>
        </CanvasErrorBoundary>
      )}
    </div>
  );
}
