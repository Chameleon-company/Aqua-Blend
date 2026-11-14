using AquaBlend.Exceptions;

namespace AquaBlend.Middleware;

/// <summary>
/// Catches ApiException (and anything unhandled) and writes one consistent
/// application/problem+json body with a `code` field, instead of each controller/service
/// improvising its own error shape (Backend/docs/definition-of-done.md flagged this as
/// inconsistent — ChangesController's ad hoc `{ error }` shape predates this and is left as-is).
/// </summary>
public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException ex)
        {
            await WriteProblemAsync(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteProblemAsync(context, StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "An unexpected error occurred.");
        }
    }

    private static Task WriteProblemAsync(HttpContext context, int statusCode, string code, string detail)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        return context.Response.WriteAsJsonAsync(new
        {
            type = $"https://httpstatuses.io/{statusCode}",
            title = code,
            status = statusCode,
            detail,
            code,
        });
    }
}
