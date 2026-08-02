using System.Net;
using System.Text.Json;
using AquaBlend.DTOs.Common;

namespace AquaBlend.Middleware
{
    /// <summary>
    /// Catches any unhandled exception thrown further down the pipeline
    /// (controllers, services, EF Core, etc.) and converts it into the
    /// standard <see cref="ApiErrorResponse"/> JSON shape instead of letting
    /// ASP.NET Core return its default HTML/blank error page.
    ///
    /// Registered once in Program.cs, as early as possible in the pipeline:
    ///     app.UseMiddleware&lt;ExceptionMiddleware&gt;();
    /// </summary>
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IHostEnvironment _environment;

        private static readonly JsonSerializerOptions SerializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public ExceptionMiddleware(
            RequestDelegate next,
            ILogger<ExceptionMiddleware> logger,
            IHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "Unhandled exception while processing {Method} {Path} (traceId: {TraceId})",
                    context.Request.Method,
                    context.Request.Path,
                    context.TraceIdentifier);

                await WriteErrorResponseAsync(context, exception);
            }
        }

        private async Task WriteErrorResponseAsync(HttpContext context, Exception exception)
        {
            var response = new ApiErrorResponse
            {
                Type = "server_error",
                Title = "An unexpected error occurred while processing the request.",
                Status = (int)HttpStatusCode.InternalServerError,
                Instance = context.Request.Path,
                TraceId = context.TraceIdentifier,
                // Only surface the raw exception message outside Production so we don't
                // leak internal details (stack traces, connection strings, etc.) to clients.
                Detail = _environment.IsDevelopment() ? exception.Message : null
            };

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = response.Status;

            await context.Response.WriteAsync(JsonSerializer.Serialize(response, SerializerOptions));
        }
    }
}
