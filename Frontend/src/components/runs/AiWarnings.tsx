import clsx from "clsx";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { classifyWarning } from "@/utils/aiReport";
import type { StatusTone } from "@/utils/resultStatus";

const TONE_ICON: Record<StatusTone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertOctagon,
};

const TONE_TEXT: Record<StatusTone, string> = {
  neutral: "text-ink-muted",
  info: "text-primary-hover",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export interface AiWarningsProps {
  warnings: string[];
}

/**
 * Compact alert rows, not one card per warning (Part 7). Wording is always
 * the original backend/AI text — classifyWarning only chooses an icon, tone,
 * and short kicker for scanability; it never rewrites the warning itself.
 */
export function AiWarnings({ warnings }: AiWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Warnings & Data Quality" />
      <ul className="flex flex-col divide-y divide-border">
        {warnings.map((text, index) => {
          const { title, tone } = classifyWarning(text);
          const Icon = TONE_ICON[tone];
          return (
            <li key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", TONE_TEXT[tone])} aria-hidden="true" />
              <div>
                <p className={clsx("text-sm font-medium", TONE_TEXT[tone])}>{title}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
