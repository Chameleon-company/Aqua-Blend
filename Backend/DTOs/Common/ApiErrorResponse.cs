using System.Text.Json.Serialization;

namespace AquaBlend.DTOs.Common
{
    /// <summary>
    /// Standard error envelope returned by every AquaBlend endpoint.
    /// Loosely based on RFC 7807 (Problem Details for HTTP APIs) so it plays
    /// nicely with the OpenAPI docs, with an added "errors" list for
    /// field-level validation failures.
    ///
    /// Example (404):
    /// {
    ///   "type": "not_found",
    ///   "title": "Resource not found",
    ///   "status": 404,
    ///   "detail": "Scenario with id 42 was not found.",
    ///   "instance": "/api/scenarios/42",
    ///   "traceId": "0HN...",
    ///   "timestamp": "2026-08-02T10:15:00Z"
    /// }
    ///
    /// Example (400 - validation):
    /// {
    ///   "type": "validation_error",
    ///   "title": "One or more validation errors occurred.",
    ///   "status": 400,
    ///   "instance": "/api/scenarios",
    ///   "traceId": "0HN...",
    ///   "timestamp": "2026-08-02T10:15:00Z",
    ///   "errors": [
    ///     { "field": "Name", "message": "The Name field is required." }
    ///   ]
    /// }
    /// </summary>
    public class ApiErrorResponse
    {
        /// <summary>Short, machine-readable error code (e.g. "not_found", "validation_error", "server_error").</summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>Short, human-readable summary of the problem.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>HTTP status code, duplicated in the body for convenience.</summary>
        public int Status { get; set; }

        /// <summary>Optional, more specific explanation of this particular occurrence.</summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Detail { get; set; }

        /// <summary>The request path that produced the error.</summary>
        public string Instance { get; set; } = string.Empty;

        /// <summary>Correlation id (ASP.NET Core's TraceIdentifier) to help match a report to server logs.</summary>
        public string TraceId { get; set; } = string.Empty;

        /// <summary>UTC time the error was generated.</summary>
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>Field-level validation failures. Only populated for validation_error responses.</summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<ApiValidationError>? Errors { get; set; }
    }

    /// <summary>A single field-level validation failure.</summary>
    public class ApiValidationError
    {
        /// <summary>Name of the field/property that failed validation.</summary>
        public string Field { get; set; } = string.Empty;

        /// <summary>Human-readable validation message for that field.</summary>
        public string Message { get; set; } = string.Empty;
    }
}
