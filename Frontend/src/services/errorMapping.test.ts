import { describe, expect, it } from "vitest";
import { ServiceError, toAppError } from "./errorMapping";

describe("toAppError", () => {
  it("preserves the category from a ServiceError", () => {
    const err = new ServiceError("NOT_FOUND", "Scenario not found.");
    expect(toAppError(err)).toEqual({ category: "NOT_FOUND", message: "Scenario not found.", cause: err });
  });

  it("maps a generic Error to UNKNOWN_ERROR", () => {
    const err = new Error("boom");
    expect(toAppError(err).category).toBe("UNKNOWN_ERROR");
  });

  it("maps a non-Error throw to UNKNOWN_ERROR without throwing", () => {
    expect(toAppError("just a string").category).toBe("UNKNOWN_ERROR");
  });
});
