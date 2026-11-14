import clsx from "clsx";

export interface RangeBarProps {
  value: number;
  lowerLimit?: number;
  upperLimit?: number;
  isBinding?: boolean;
}

/**
 * Decorative range indicator — layout.md §12.3 / AquaBlend_frontend_layout.md §14.
 * Purely supplementary: the numeric value/limits are always rendered as text
 * alongside this, so it is safe to hide from assistive tech.
 */
export function RangeBar({ value, lowerLimit, upperLimit, isBinding }: RangeBarProps) {
  if (lowerLimit === undefined || upperLimit === undefined || upperLimit === lowerLimit) {
    return null;
  }

  const clampedPercent = Math.min(100, Math.max(0, ((value - lowerLimit) / (upperLimit - lowerLimit)) * 100));
  const outOfRange = value < lowerLimit || value > upperLimit;

  return (
    <div aria-hidden="true" className="relative h-1.5 w-full rounded-full bg-surface-sunken">
      <div
        className={clsx(
          "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface top-1/2",
          outOfRange ? "bg-danger" : isBinding ? "bg-warning" : "bg-accent",
        )}
        style={{ left: `${clampedPercent}%` }}
      />
    </div>
  );
}
