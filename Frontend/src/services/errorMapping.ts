import type { AppError, FrontendErrorCategory } from "@/types/errors";

/** Thrown by service adapters (mock or real) with a known category attached. */
export class ServiceError extends Error {
  category: FrontendErrorCategory;

  constructor(category: FrontendErrorCategory, message: string) {
    super(message);
    this.name = "ServiceError";
    this.category = category;
  }
}

/** Normalises any thrown value into the frontend's presentation error model. */
export function toAppError(error: unknown): AppError {
  if (error instanceof ServiceError) {
    return { category: error.category, message: error.message, cause: error };
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return {
      category: "NETWORK_ERROR",
      message: "Could not reach the AquaBlend service. Check your connection and try again.",
      cause: error,
    };
  }

  if (error instanceof Error) {
    return { category: "UNKNOWN_ERROR", message: error.message, cause: error };
  }

  return {
    category: "UNKNOWN_ERROR",
    message: "An unexpected error occurred.",
    cause: error,
  };
}
