import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatCurrency, formatPercent, isPresent } from "@/utils/formatters";
import {
  formatConfidenceFlag,
  formatGateResult,
  formatReportMode,
  formatSolverStatus,
  hintForReportMode,
  readAiReportSnapshot,
  toneForConfidenceFlag,
  toneForGateResult,
  toneForReportMode,
  toneForSolverStatus,
} from "@/utils/aiReport";
import { normalizeQuality } from "./MilpQualityResults";
import type { StatusTone } from "@/utils/resultStatus";
import type { MilpAiOutputDto, MilpModelOutputDto } from "@/types/run";

const TILE_VALUE_TONE: Record<StatusTone, string> = {
  neutral: "text-ink",
  info: "text-primary-hover",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

interface Tile {
  key: string;
  label: string;
  value: string;
  tone: StatusTone;
  hint?: string;
}

export interface AiStatusStripProps {
  aiOutput: MilpAiOutputDto;
  milpOutput: MilpModelOutputDto | null;
}

/**
 * Compact "Analysis mode / Confidence / Validation / Solver" strip (Part 3),
 * extended with a small set of already-structured MILP metrics (Part 6) when
 * available. Every tile is independently optional — a missing value simply
 * omits its tile rather than rendering "undefined", and the whole strip
 * disappears if nothing is available to show.
 */
export function AiStatusStrip({ aiOutput, milpOutput }: AiStatusStripProps) {
  const snapshot = readAiReportSnapshot(aiOutput.rawAiJson);
  const tiles: Tile[] = [];

  const reportModeLabel = formatReportMode(snapshot.reportMode);
  if (reportModeLabel) {
    tiles.push({
      key: "mode",
      label: "Analysis mode",
      value: reportModeLabel,
      tone: toneForReportMode(snapshot.reportMode),
      hint: hintForReportMode(snapshot.reportMode),
    });
  }

  const confidenceLabel = formatConfidenceFlag(snapshot.confidenceFlag);
  if (confidenceLabel) {
    tiles.push({ key: "confidence", label: "Confidence", value: confidenceLabel, tone: toneForConfidenceFlag(snapshot.confidenceFlag) });
  }

  const gateLabel = formatGateResult(snapshot.gateResult);
  if (gateLabel) {
    tiles.push({ key: "gate", label: "Validation", value: gateLabel, tone: toneForGateResult(snapshot.gateResult) });
  }

  const solverLabel = formatSolverStatus(milpOutput?.solverStatus ?? null);
  if (solverLabel) {
    tiles.push({ key: "solver", label: "Solver", value: solverLabel, tone: toneForSolverStatus(milpOutput?.solverStatus ?? null) });
  }

  if (isPresent(milpOutput?.totalCost ?? null)) {
    tiles.push({ key: "cost", label: "Total Cost", value: formatCurrency(milpOutput?.totalCost), tone: "neutral" });
  }

  const demand = milpOutput?.totalDemandMlPerDay ?? null;
  const delivered = milpOutput?.totalDeliveredMlPerDay ?? null;
  if (isPresent(demand) && isPresent(delivered) && demand > 0) {
    tiles.push({ key: "demand", label: "Demand Met", value: formatPercent(delivered / demand, 0), tone: "neutral" });
  }

  if (milpOutput?.quality) {
    const reported = normalizeQuality(milpOutput.quality).filter((row) => row.withinLimits !== null);
    if (reported.length > 0) {
      const violations = reported.filter((row) => row.withinLimits === false).length;
      tiles.push({
        key: "quality",
        label: "Quality",
        value: violations === 0 ? "0 violations" : `${violations} violation${violations === 1 ? "" : "s"}`,
        tone: violations === 0 ? "success" : "danger",
      });
    }
  }

  if (tiles.length === 0) return null;

  return (
    <Card padding="sm">
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        {tiles.map((tile) => (
          <div key={tile.key} className="min-w-28">
            <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {tile.label}
              {tile.hint ? <InfoTooltip label={tile.hint} /> : null}
            </dt>
            <dd className={clsx("mt-1 text-sm font-semibold", TILE_VALUE_TONE[tile.tone])}>{tile.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
