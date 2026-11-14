namespace AquaBlend.DTOs.Scenarios;

public class ValidationIssueDto
{
    public string Message { get; set; } = string.Empty;
    public string? Field { get; set; }

    // "error" | "warning"
    public string Severity { get; set; } = "error";
}

public class ValidationResultDto
{
    public bool Valid { get; set; }
    public List<ValidationIssueDto> Issues { get; set; } = new();
}
