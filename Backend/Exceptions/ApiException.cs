using Microsoft.AspNetCore.Http;

namespace AquaBlend.Exceptions;

/// <summary>
/// Base for exceptions the API pipeline maps to a consistent ProblemDetails-shaped response
/// with a machine-readable `code` (Backend/Middleware/ApiExceptionMiddleware.cs). Existing
/// [ApiController] model validation already returns ValidationProblemDetails for 400s; this
/// covers the 404/409 domain errors services need to signal.
/// </summary>
public abstract class ApiException : Exception
{
    protected ApiException(int statusCode, string code, string message) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public int StatusCode { get; }
    public string Code { get; }
}

public sealed class NotFoundApiException : ApiException
{
    public NotFoundApiException(string message) : base(StatusCodes.Status404NotFound, "NOT_FOUND", message)
    {
    }
}

public sealed class ConflictApiException : ApiException
{
    public ConflictApiException(string code, string message) : base(StatusCodes.Status409Conflict, code, message)
    {
    }
}

public sealed class NotImplementedApiException : ApiException
{
    public NotImplementedApiException(string code, string message) : base(StatusCodes.Status501NotImplemented, code, message)
    {
    }
}

/// <summary>
/// Raised by Services/CanonicalScenarioBuilder.cs (and Services/ScenarioJsonAdapter.cs, when a
/// stored scenario_id disagrees with Scenarios.ExternalId) when a scenario cannot be resolved
/// into a valid canonical MILP document — an unresolvable reference ID, incomplete reference
/// data (e.g. a quality parameter missing min/max), or a non-finite/inverted numeric value.
/// Deliberately distinct from validation "issues" (ValidationIssueDto): those describe an
/// incomplete draft that is still safe to save; this describes data that cannot be represented
/// in the canonical contract at all, so the write itself is rejected.
/// </summary>
public sealed class ScenarioContractApiException : ApiException
{
    public IReadOnlyList<string> Errors { get; }

    public ScenarioContractApiException(IReadOnlyList<string> errors)
        : base(StatusCodes.Status422UnprocessableEntity, "SCENARIO_CONTRACT_ERROR", string.Join(" ", errors))
    {
        Errors = errors;
    }
}
