import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunCacheBadges } from "./RunCacheBadges";

describe("RunCacheBadges", () => {
  it("renders nothing when no flag applies", () => {
    const { container } = render(<RunCacheBadges />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'Optimisation result reused' when milpCacheHit is true", () => {
    render(<RunCacheBadges milpCacheHit />);
    expect(screen.getByText("Optimisation result reused")).toBeInTheDocument();
  });

  it("shows 'Forced re-run' when forceRerun is true", () => {
    render(<RunCacheBadges forceRerun />);
    expect(screen.getByText("Forced re-run")).toBeInTheDocument();
  });

  it("shows 'AI analysis reused' when aiCacheHit is true", () => {
    render(<RunCacheBadges aiCacheHit />);
    expect(screen.getByText("AI analysis reused")).toBeInTheDocument();
  });

  it("shows 'Legacy result' for a legacy OptimisationResults fallback", () => {
    render(<RunCacheBadges isLegacyFallback />);
    expect(screen.getByText("Legacy result")).toBeInTheDocument();
  });

  it("can show multiple badges at once (forced + legacy)", () => {
    render(<RunCacheBadges forceRerun isLegacyFallback />);
    expect(screen.getByText("Forced re-run")).toBeInTheDocument();
    expect(screen.getByText("Legacy result")).toBeInTheDocument();
  });
});
