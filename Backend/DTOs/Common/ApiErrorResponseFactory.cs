using Microsoft.AspNetCore.Http;

namespace AquaBlend.DTOs.Common
{
    /// <summary>
    /// Builds <see cref="ApiErrorResponse"/> instances so every controller/middleware
    /// produces the exact same JSON shape instead of hand-rolling anonymous objects.
    ///
    /// Example usage inside a controller:
    ///     if (scenario == null)
    ///     {
    ///         return NotFound(ApiErrorResponseFactory.NotFound(HttpContext, $"Scenario with id {id} was not found."));
    ///     }
    /// </summary>
    public static class ApiErrorResponseFactory
    {
        public static ApiErrorResponse NotFound(HttpContext context, string detail) =>
            Build(context, "not_found", "Resource not found", StatusCodes.Status404NotFound, detail);

        public static ApiErrorResponse BadRequest(HttpContext context, string detail) =>
            Build(context, "bad_request", "The request could not be processed", StatusCodes.Status400BadRequest, detail);

        public static ApiErrorResponse Unauthorized(HttpContext context, string detail = "Authentication is required to access this resource.") =>
            Build(context, "unauthorized", "Authentication required", StatusCodes.Status401Unauthorized, detail);

        public static ApiErrorResponse Forbidden(HttpContext context, string detail = "You do not have permission to perform this action.") =>
            Build(context, "forbidden", "Access denied", StatusCodes.Status403Forbidden, detail);

        public static ApiErrorResponse Validation(HttpContext context, List<ApiValidationError> errors)
        {
            var response = Build(context, "validation_error", "One or more validation errors occurred.", StatusCodes.Status400BadRequest, detail: null);
            response.Errors = errors;
            return response;
        }

        private static ApiErrorResponse Build(HttpContext context, string type, string title, int status, string? detail) => new()
        {
            Type = type,
            Title = title,
            Status = status,
            Detail = detail,
            Instance = context.Request.Path,
            TraceId = context.TraceIdentifier,
            Timestamp = DateTime.UtcNow
        };
    }
}
