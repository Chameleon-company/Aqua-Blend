import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunStatus } from "./RunStatus";
import { RUN_WORKFLOW_STATUSES } from "@/types/run";

describe("RunStatus", () => {
  it("renders 'queued' without crashing (AquaBlend_Frontend_Final_Integration_Implementation.md §3)", () => {
    expect(() => render(<RunStatus status="queued" runId="RUN-1002" scenarioId="SCN-001" />)).not.toThrow();
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });

  it("renders every real backend workflow status without crashing", () => {
    for (const status of RUN_WORKFLOW_STATUSES) {
      const { unmount } = render(<RunStatus status={status} runId="RUN-1002" scenarioId="SCN-001" />);
      unmount();
    }
  });

  it("renders a neutral fallback pill for an unrecognised future status instead of throwing", () => {
    expect(() => render(<RunStatus status="some_future_status" />)).not.toThrow();
    expect(screen.getByText("some_future_status")).toBeInTheDocument();
  });

  it("never crashes on a missing/null status", () => {
    expect(() => render(<RunStatus status={null} />)).not.toThrow();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows a loading pill while loading, ignoring the status prop", () => {
    render(<RunStatus status="queued" loading />);
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });
});
