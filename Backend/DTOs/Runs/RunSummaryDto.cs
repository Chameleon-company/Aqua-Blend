namespace AquaBlend.DTOs.Runs;

public class RunSummaryDto
{
    public string RunId { get; set; } = string.Empty;
    public string ScenarioId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? SolverOutcome { get; set; }
    public DateTime CreatedAt { get; set; }

    public bool ForceRerun { get; set; }
    public bool MilpCacheHit { get; set; }
    public bool AiCacheHit { get; set; }
}
