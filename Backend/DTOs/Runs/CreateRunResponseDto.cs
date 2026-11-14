namespace AquaBlend.DTOs.Runs;

public class CreateRunResponseDto
{
    public string RunId { get; set; } = string.Empty;

    // "accepted" | "rejected" — rejection is communicated as an HTTP error status instead
    // (409 when the scenario isn't ready), so this is always "accepted" on a 2xx response.
    public string Status { get; set; } = "accepted";

    public string? Message { get; set; }
}
