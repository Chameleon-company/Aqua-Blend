namespace AquaBlend.DTOs.Scenarios;

public class ScenarioRunRefDto
{
    public string RunId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ScenarioSummaryDto
{
    public string ScenarioId { get; set; } = string.Empty;
    public string ScenarioName { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ScenarioRunRefDto? MostRecentRun { get; set; }
}
