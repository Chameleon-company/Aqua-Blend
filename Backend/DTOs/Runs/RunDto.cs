namespace AquaBlend.DTOs.Runs;

public class RunDto
{
    public string RunId { get; set; } = string.Empty;
    public string ScenarioId { get; set; } = string.Empty;
    public string? ScenarioName { get; set; }

    // queued | preparing_input | milp_running | milp_completed | ai_queued | ai_running |
    // completed | completed_with_ai_error | failed — see Domain/RunWorkflowStatuses.cs.
    public string Status { get; set; } = string.Empty;

    // optimal | infeasible
    public string? SolverOutcome { get; set; }

    public string? ProgressMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public double? SolveTimeMs { get; set; }
    public decimal? ObjectiveValue { get; set; }
    public string? Error { get; set; }

    public bool ForceRerun { get; set; }
    public bool MilpCacheHit { get; set; }
    public bool AiCacheHit { get; set; }

    // External run identifiers, not raw internal integer IDs — this API's clients work in terms
    // of ExternalId throughout (AquaBlend_Backend_Final_Integration_Implementation.md §16).
    public string? MilpInputId { get; set; }
    public string? MilpOutputId { get; set; }
    public string? AiOutputId { get; set; }

    public string? ReusedMilpFromRunId { get; set; }
    public string? ReusedAiFromRunId { get; set; }

    public DateTime? MilpStartedAt { get; set; }
    public DateTime? MilpCompletedAt { get; set; }
    public DateTime? AiStartedAt { get; set; }
    public DateTime? AiCompletedAt { get; set; }
}
