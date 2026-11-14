import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiAnalysisSection } from "./AiAnalysisSection";
import type { MilpAiOutputDto, MilpModelOutputDto } from "@/types/run";

function baseAiOutput(overrides: Partial<MilpAiOutputDto> = {}): MilpAiOutputDto {
  return {
    id: "ai-1",
    status: "completed",
    aiProvider: null,
    aiModel: null,
    aiModelVersion: null,
    promptVersion: null,
    analysisVersion: null,
    aiContractVersion: "1.0",
    milpOutputHash: null,
    aiCacheKey: null,
    aiInputJson: {},
    executiveSummary: null,
    decisionExplanation: null,
    keyFindings: null,
    anomalies: null,
    recommendations: null,
    warnings: [],
    riskAssessment: null,
    sourceAnalysis: null,
    plantAnalysis: null,
    qualityAnalysis: null,
    limitations: null,
    rawAiJson: {},
    aiOutputHash: null,
    cacheReusable: true,
    forcedRecompute: false,
    latencyMs: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    errorCode: null,
    errorMessage: null,
    createdAt: "2026-01-01T00:00:00Z",
    startedAt: null,
    completedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("AiAnalysisSection with aiOutput = null", () => {
  it("renders a queued state without crashing", () => {
    expect(() => render(<AiAnalysisSection status="ai_queued" aiOutput={null} />)).not.toThrow();
    expect(screen.getByText("AI analysis queued")).toBeInTheDocument();
  });

  it("renders a running state without crashing", () => {
    render(<AiAnalysisSection status="ai_running" aiOutput={null} />);
    expect(screen.getByText("AI analysis in progress")).toBeInTheDocument();
  });

  it("shows an active loading indicator (not a 'no analysis available' message) while ai_running", () => {
    render(<AiAnalysisSection status="ai_running" aiOutput={null} />);
    expect(screen.getByText(/analysing optimisation results/i)).toBeInTheDocument();
    expect(screen.queryByText("No AI analysis available")).not.toBeInTheDocument();
  });

  it("renders an AI-error state for completed_with_ai_error without crashing", () => {
    render(<AiAnalysisSection status="completed_with_ai_error" aiOutput={null} />);
    expect(screen.getByText("AI analysis could not be completed.")).toBeInTheDocument();
  });

  it("does not present completed_with_ai_error as an optimisation failure", () => {
    render(<AiAnalysisSection status="completed_with_ai_error" aiOutput={null} />);
    expect(screen.queryByText("Optimisation failed")).not.toBeInTheDocument();
  });

  it("renders a not-started fallback for a queued/milp_running run without crashing", () => {
    expect(() => render(<AiAnalysisSection status="queued" aiOutput={null} />)).not.toThrow();
    expect(() => render(<AiAnalysisSection status="milp_running" aiOutput={null} />)).not.toThrow();
  });

  it("never crashes for an unrecognised status", () => {
    expect(() => render(<AiAnalysisSection status="some_future_status" aiOutput={null} />)).not.toThrow();
  });
});

describe("AiAnalysisSection with a populated aiOutput", () => {
  it("renders the executive summary and key findings", () => {
    const output = baseAiOutput({ executiveSummary: "Everything looks fine.", keyFindings: ["Finding one"] });
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByText("Everything looks fine.")).toBeInTheDocument();
    expect(screen.getByText("Finding one")).toBeInTheDocument();
  });

  it("renders TEMPLATE_FALLBACK as a legitimate, non-alarming analysis mode", () => {
    const output = baseAiOutput({
      decisionExplanation: "An optimal solution was found.",
      rawAiJson: { report_mode: "TEMPLATE_FALLBACK", confidence_flag: "PROVISIONAL", gate_result: "PASS" },
    });
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByText("Template fallback")).toBeInTheDocument();
    expect(screen.getByText("Provisional")).toBeInTheDocument();
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText("TEMPLATE_FALLBACK")).not.toBeInTheDocument();
  });

  it("fits a future LLM_VALIDATED report into the same UI", () => {
    const output = baseAiOutput({
      decisionExplanation: "An optimal solution was found.",
      rawAiJson: { report_mode: "LLM_VALIDATED", confidence_flag: "VALIDATED", gate_result: "PASS" },
    });
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByText("AI validated")).toBeInTheDocument();
    expect(screen.getByText("Validated")).toBeInTheDocument();
  });

  it("renders Markdown headings from decisionExplanation instead of literal '##' markers", () => {
    const output = baseAiOutput({
      decisionExplanation: "## Scenario & Solver Status\n\nSolved optimally.\n\n## Cost Summary\n\nTotal cost is low.",
    });
    const { container } = render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByRole("heading", { name: "Scenario & Solver Status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cost Summary" })).toBeInTheDocument();
    expect(container.textContent).not.toContain("##");
  });

  it("shows the deterministic explanation under Executive Overview instead of the misleading 'no executive summary' message when only decisionExplanation exists", () => {
    const output = baseAiOutput({ executiveSummary: null, decisionExplanation: "## Result Availability\n\nAn optimal result is available." });
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.queryByText(/no executive summary was provided/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no analysis summary is available/i)).not.toBeInTheDocument();
    expect(screen.getByText(/an optimal result is available/i)).toBeInTheDocument();
  });

  it("shows the empty-summary message only when both executiveSummary and decisionExplanation are unavailable", () => {
    const output = baseAiOutput({ executiveSummary: null, decisionExplanation: null });
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByText("No analysis summary is available for this run.")).toBeInTheDocument();
  });

  it("does not render an empty/oversized Detailed Analysis section when no structured fields are populated", () => {
    const output = baseAiOutput();
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.queryByText("Detailed Analysis")).not.toBeInTheDocument();
  });

  it("renders Detailed Analysis accordions only for fields that actually have content", () => {
    const output = baseAiOutput({ riskAssessment: { level: "low" }, recommendations: ["Reduce reliance on Source A"] });
    render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByText("Detailed Analysis")).toBeInTheDocument();
    expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.queryByText("Source Analysis")).not.toBeInTheDocument();
    expect(screen.queryByText("Plant Analysis")).not.toBeInTheDocument();
  });

  it("renders warnings as safe, distinct alert rows without altering their text", () => {
    const warnings = [
      "One or more source inputs contain estimated values; interpret the result and confidence flag accordingly.",
      "Validated LLM explanation was unavailable; a deterministic template fallback is being displayed.",
    ];
    const output = baseAiOutput({ warnings });
    expect(() => render(<AiAnalysisSection status="completed" aiOutput={output} />)).not.toThrow();
    expect(screen.getByText("Warnings & Data Quality")).toBeInTheDocument();
    for (const warning of warnings) {
      expect(screen.getByText(warning)).toBeInTheDocument();
    }
    expect(screen.getByText("Estimated source data")).toBeInTheDocument();
    expect(screen.getByText("Analysis mode")).toBeInTheDocument();
  });

  it("renders raw AI output collapsed by default under Technical Details", () => {
    const output = baseAiOutput({ rawAiJson: { report_mode: "TEMPLATE_FALLBACK" } });
    const { container } = render(<AiAnalysisSection status="completed" aiOutput={output} />);
    expect(screen.getByText("Technical Details")).toBeInTheDocument();
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("shows structured MILP metrics in the status strip when milpOutput is available", () => {
    const output = baseAiOutput({ rawAiJson: { report_mode: "TEMPLATE_FALLBACK" } });
    const milpOutput = { solverStatus: "OPTIMAL", totalCost: 184150, totalDemandMlPerDay: 500, totalDeliveredMlPerDay: 500 } as MilpModelOutputDto;
    render(<AiAnalysisSection status="completed" aiOutput={output} milpOutput={milpOutput} />);
    expect(screen.getByText("Optimal")).toBeInTheDocument();
  });
});
