import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunWorkflowProgress } from "./RunWorkflowProgress";
import { RUN_WORKFLOW_STATUSES } from "@/types/run";

describe("RunWorkflowProgress", () => {
  it("renders every real backend workflow status without crashing", () => {
    for (const status of RUN_WORKFLOW_STATUSES) {
      const { unmount } = render(<RunWorkflowProgress status={status} />);
      unmount();
    }
  });

  it("marks Optimising as the current step for milp_running", () => {
    render(<RunWorkflowProgress status="milp_running" />);
    const optimising = screen.getByText("Optimising").closest("li");
    expect(optimising).not.toBeNull();
    expect(optimising?.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it("marks Analysing as the current step for ai_running, with Optimising already done", () => {
    render(<RunWorkflowProgress status="ai_running" />);
    const analysing = screen.getByText("Analysing").closest("li");
    expect(analysing?.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it("shows every stage as complete for completed", () => {
    render(<RunWorkflowProgress status="completed" />);
    expect(screen.queryByText(/current step/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/completed\)/i)).toHaveLength(5);
  });

  it("keeps Complete reachable and flags Analysing with a warning for completed_with_ai_error", () => {
    render(<RunWorkflowProgress status="completed_with_ai_error" />);
    expect(screen.getByText(/analysis layer encountered a problem/i)).toBeInTheDocument();
    const analysing = screen.getByText("Analysing").closest("li");
    expect(analysing?.textContent).toMatch(/completed with a warning/i);
  });

  it("renders failed safely without crashing and shows the failure sentence", () => {
    expect(() => render(<RunWorkflowProgress status="failed" />)).not.toThrow();
    expect(screen.getByText("The run could not be completed.")).toBeInTheDocument();
  });

  it("prefers a meaningful progressMessage over the generic sentence", () => {
    render(<RunWorkflowProgress status="ai_running" progressMessage="MILP completed; AI analysis is running." />);
    expect(screen.getByText("MILP completed; AI analysis is running.")).toBeInTheDocument();
  });

  it("falls back to a plain status pill for an unrecognised status instead of crashing", () => {
    expect(() => render(<RunWorkflowProgress status="some_future_status" />)).not.toThrow();
    expect(screen.getByText("some_future_status")).toBeInTheDocument();
  });

  it("never crashes for a missing/null status", () => {
    expect(() => render(<RunWorkflowProgress status={null} />)).not.toThrow();
  });

  it("renders scenario/run metadata when provided", () => {
    render(<RunWorkflowProgress status="completed" scenarioId="SCN-001" scenarioName="Drought Scenario" runId="RUN-1001" />);
    expect(screen.getByText("Drought Scenario")).toBeInTheDocument();
    expect(screen.getByText("RUN-1001")).toBeInTheDocument();
  });
});
