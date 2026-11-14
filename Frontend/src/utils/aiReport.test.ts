import { describe, expect, it } from "vitest";
import {
  classifyWarning,
  formatConfidenceFlag,
  formatGateResult,
  formatReportMode,
  formatSolverStatus,
  readAiReportSnapshot,
  toTextList,
} from "./aiReport";

describe("readAiReportSnapshot", () => {
  it("reads report_mode/confidence_flag/gate_result from the AI worker's raw app-response JSON", () => {
    const snapshot = readAiReportSnapshot({
      report_mode: "TEMPLATE_FALLBACK",
      confidence_flag: "PROVISIONAL",
      gate_result: "PASS",
    });
    expect(snapshot).toEqual({ reportMode: "TEMPLATE_FALLBACK", confidenceFlag: "PROVISIONAL", gateResult: "PASS" });
  });

  it("never throws for null/undefined/non-object rawAiJson", () => {
    expect(() => readAiReportSnapshot(null)).not.toThrow();
    expect(() => readAiReportSnapshot(undefined)).not.toThrow();
    expect(() => readAiReportSnapshot("not an object")).not.toThrow();
    expect(readAiReportSnapshot(null)).toEqual({ reportMode: null, confidenceFlag: null, gateResult: null });
  });
});

describe("friendly enum labels", () => {
  it("maps known report modes to clean labels, not raw enum text", () => {
    expect(formatReportMode("TEMPLATE_FALLBACK")).toBe("Template fallback");
    expect(formatReportMode("LLM_VALIDATED")).toBe("AI validated");
  });

  it("falls back to a readable title case for an unmapped enum value instead of raw text", () => {
    expect(formatReportMode("SOME_NEW_MODE")).toBe("Some New Mode");
  });

  it("returns null for empty/missing values so callers can omit the tile", () => {
    expect(formatReportMode(null)).toBeNull();
    expect(formatReportMode("")).toBeNull();
  });

  it("maps confidence, gate, and solver status enums", () => {
    expect(formatConfidenceFlag("PROVISIONAL")).toBe("Provisional");
    expect(formatGateResult("PASS")).toBe("Pass");
    expect(formatSolverStatus("OPTIMAL")).toBe("Optimal");
  });
});

describe("toTextList", () => {
  it("normalises an array of strings", () => {
    expect(toTextList(["a", "b"])).toEqual(["a", "b"]);
  });

  it("extracts a message-like field from an array of objects", () => {
    expect(toTextList([{ message: "hello" }])).toEqual(["hello"]);
  });

  it("returns [] for null/undefined/non-array input instead of throwing", () => {
    expect(toTextList(null)).toEqual([]);
    expect(toTextList(undefined)).toEqual([]);
    expect(toTextList("not an array")).toEqual([]);
    expect(toTextList({})).toEqual([]);
  });
});

describe("classifyWarning", () => {
  it("classifies the real worker warning strings with a non-alarming tone for the fallback-mode notice", () => {
    expect(classifyWarning("Validated LLM explanation was unavailable; a deterministic template fallback is being displayed.")).toEqual({
      title: "Analysis mode",
      tone: "info",
    });
  });

  it("classifies estimated-data and water-quality-scope warnings", () => {
    expect(classifyWarning("One or more source inputs contain estimated values; interpret the result and confidence flag accordingly.").title).toBe(
      "Estimated source data",
    );
    expect(classifyWarning("Water-quality values apply to the blend at plant inflow, not to post-treatment regulatory water quality.").title).toBe(
      "Water-quality scope",
    );
  });

  it("falls back to a safe default (not red/danger) for unrecognised warning text", () => {
    const result = classifyWarning("Some completely new warning text from a future worker version.");
    expect(result.title).toBe("Notice");
    expect(result.tone).toBe("warning");
  });
});
