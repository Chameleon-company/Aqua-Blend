"use client";

import { Gauge, DollarSign, Droplets, Target, Database, Factory } from "lucide-react";
import { useAnalysisContext } from "../layout";
import { LocalSubNav } from "@/components/layout/LocalSubNav";
import { Card, CardHeader } from "@/components/ui/Card";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { SourceAllocationChart } from "@/components/analysis/SourceAllocationChart";
import { BlendCompositionChart } from "@/components/analysis/BlendCompositionChart";
import { PlantUtilisationBars } from "@/components/analysis/PlantUtilisationBars";
import { DemandFulfilmentChart } from "@/components/analysis/DemandFulfilmentChart";
import { CostBreakdownChart } from "@/components/analysis/CostBreakdownChart";
import { SourceResults } from "@/components/results/SourceResults";
import { PlantResults } from "@/components/results/PlantResults";
import { DemandResults } from "@/components/results/DemandResults";
import { QualityResults } from "@/components/results/QualityResults";
import { CostBreakdown } from "@/components/results/CostBreakdown";
import { DecisionEvidence } from "@/components/results/DecisionEvidence";
import { WarningList } from "@/components/results/WarningList";
import { NetworkResults } from "@/components/network/NetworkResults";
import { InfeasibleState } from "@/components/states/InfeasibleState";
import { DiagnosticPanel } from "@/components/diagnostics/DiagnosticPanel";
import { computeSummaryMetrics } from "@/utils/aggregates";
import { formatCurrency, formatMlPerDay, formatNumber, formatPercent, formatSolveTime, MISSING_VALUE } from "@/utils/formatters";
import type { StatusTone } from "@/utils/resultStatus";

function solverStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === "infeasible") return "danger";
  if (s === "optimal" || s === "feasible" || s === "solved") return "success";
  return "neutral";
}

const FEASIBLE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "plants", label: "Plants" },
  { id: "demand", label: "Demand" },
  { id: "network", label: "Network" },
  { id: "cost", label: "Cost" },
  { id: "quality", label: "Quality" },
  { id: "constraints", label: "Constraints" },
];

const INFEASIBLE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "diagnostics", label: "Diagnostics" },
];

export default function MilpAnalysisPage() {
  const { results: result, diagnosticsPhase, diagnostics } = useAnalysisContext();
  const isInfeasible = result.solverStatus.toLowerCase() === "infeasible";
  const m = computeSummaryMetrics(result);
  const demandSatisfaction = m.totalDemandMlPerDay && m.totalDemandMlPerDay > 0 && m.totalDeliveredMlPerDay !== null ? m.totalDeliveredMlPerDay / m.totalDemandMlPerDay : null;

  return (
    <div>
      <LocalSubNav items={isInfeasible ? INFEASIBLE_SECTIONS : FEASIBLE_SECTIONS} />

      <section id="overview" className="scroll-mt-32">
        <KpiGrid>
          <KpiCard
            label="Solver Status"
            value={<span className="capitalize">{result.solverStatus}</span>}
            secondary={`Solve time ${formatSolveTime(result.solveTimeMs)}`}
            icon={<Gauge className="h-4 w-4" />}
            tone={solverStatusTone(result.solverStatus)}
          />
          <KpiCard label="Total Cost" value={formatCurrency(m.totalCost)} icon={<DollarSign className="h-4 w-4" />} tone="neutral" />
          <KpiCard
            label="Water Supplied"
            value={m.totalDeliveredMlPerDay === null ? MISSING_VALUE : formatMlPerDay(m.totalDeliveredMlPerDay, 1)}
            secondary={m.totalDemandMlPerDay !== null ? `of ${formatMlPerDay(m.totalDemandMlPerDay, 1)} demand` : undefined}
            icon={<Droplets className="h-4 w-4" />}
            tone="neutral"
          />
          <KpiCard
            label="Demand Satisfaction"
            value={demandSatisfaction === null ? MISSING_VALUE : formatPercent(demandSatisfaction)}
            icon={<Target className="h-4 w-4" />}
            tone={demandSatisfaction !== null && demandSatisfaction < 1 ? "warning" : "success"}
            tooltip="Total water delivered as a share of total demand across all zones."
          />
          <KpiCard label="Active Sources" value={formatNumber(m.selectedSourceCount, 0)} secondary={`${result.selectedSources.length + result.unusedSources.length} available`} icon={<Database className="h-4 w-4" />} tone="neutral" />
          <KpiCard label="Active Plants" value={formatNumber(m.activePlantCount, 0)} secondary={`${result.plants.length} in network`} icon={<Factory className="h-4 w-4" />} tone="neutral" />
        </KpiGrid>
      </section>

      {isInfeasible ? (
        <div className="mt-8 flex flex-col gap-6">
          <InfeasibleState
            scenarioId={result.scenarioId}
            resultId={result.runId}
            feasibilityState={result.decisionEvidence?.feasibilityState}
            warnings={result.warnings}
          />

          <section id="diagnostics" className="scroll-mt-32">
            <Card>
              <CardHeader title="Structured Diagnostics" description="Backend-produced infeasibility evidence — the frontend does not infer causes itself." />
              <DiagnosticPanel phase={diagnosticsPhase} diagnostics={diagnostics} />
            </Card>

            {result.decisionEvidence ? (
              <Card className="mt-6">
                <CardHeader title="Affected Constraints & Assets" />
                <DecisionEvidence evidence={result.decisionEvidence} />
              </Card>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          <section id="sources" className="scroll-mt-32">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Source Allocation</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Allocation by source" description="Withdrawal, ML/day" />
                <SourceAllocationChart sources={result.selectedSources} />
              </Card>
              <Card>
                <CardHeader title="Blend composition" description="Share of the solved blend" />
                <BlendCompositionChart sources={result.selectedSources} />
              </Card>
            </div>
            <Card className="mt-6">
              <CardHeader title="Source detail" action={<InfoTooltip label="Selected sources contribute to the blend. Unused sources were available but not selected by the solver." />} />
              <SourceResults selected={result.selectedSources} unused={result.unusedSources} />
            </Card>
          </section>

          <section id="plants" className="scroll-mt-32">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Plant Performance</h2>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <Card>
                <CardHeader title="Utilisation" description="Throughput against maximum capacity" action={<InfoTooltip label="Utilisation = throughput ÷ maximum throughput capacity." />} />
                <PlantUtilisationBars plants={result.plants} />
              </Card>
              <Card padding="none" className="overflow-hidden">
                <div className="p-5 sm:p-6 pb-0">
                  <CardHeader title="Plant detail" />
                </div>
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <PlantResults plants={result.plants} />
                </div>
              </Card>
            </div>
          </section>

          <section id="demand" className="scroll-mt-32">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Demand Fulfilment</h2>
            <Card>
              <CardHeader title="Demand vs supply" description="Per demand zone" />
              <DemandFulfilmentChart zones={result.demandZones} />
            </Card>
            <Card className="mt-6">
              <CardHeader title="Zone detail" />
              <DemandResults zones={result.demandZones} />
            </Card>
          </section>

          <section id="network" className="scroll-mt-32">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Network Flow</h2>
            <Card>
              <CardHeader title="Source → Plant → Zone" description="How water moves through the solved network" action={<InfoTooltip label="Line thickness is proportional to flow volume. Hover or focus to trace a path; click to pin a selection." />} />
              <NetworkResults result={result} />
            </Card>
          </section>

          {result.costBreakdown ? (
            <section id="cost" className="scroll-mt-32">
              <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Cost Analysis</h2>
              <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <Card>
                  <CardHeader title="Cost breakdown" description="By category" />
                  <CostBreakdownChart cost={result.costBreakdown} />
                </Card>
                <Card>
                  <CardHeader title="Reconciliation" action={<InfoTooltip label="The reconstructed total is the sum of individually reported cost contributions. It should match the solver's own objective value." />} />
                  <CostBreakdown cost={result.costBreakdown} />
                </Card>
              </div>
            </section>
          ) : null}

          <section id="quality" className="scroll-mt-32">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Water Quality</h2>
            <Card>
              <CardHeader title="Blend quality vs limits" description="Which quality values are near their limits" action={<InfoTooltip label="Values reflect blend at plant inflow, not post-treatment water quality." />} />
              <QualityResults results={result.qualityResults} />
            </Card>
          </section>

          <section id="constraints" className="scroll-mt-32">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-4">Capacity & Constraint Analysis</h2>
            <Card>
              <CardHeader title="Decision & constraint evidence" description="Binding limits and constraints reported by the solver" />
              <DecisionEvidence evidence={result.decisionEvidence} />
            </Card>

            {result.warnings.length > 0 ? (
              <Card className="mt-6">
                <CardHeader title="Solver warnings" />
                <WarningList warnings={result.warnings} />
              </Card>
            ) : null}

            {result.notes && result.notes.length > 0 ? (
              <Card className="mt-6">
                <CardHeader title="Notes" />
                <ul className="flex flex-col gap-1 text-sm text-ink-muted">
                  {result.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
