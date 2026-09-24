namespace AquaBlend.Entities;

public class OptimisationRun
{
    public int Id { get; set; }

    public int ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;

    public string WorkflowStatus { get; set; } = "draft";

    public string? SolverStatus { get; set; }

    // Populated when WorkflowStatus is "failed".
    // Describes why the workflow failed.
    public string? FailureReason { get; set; }

    // Identifies which component declared the failure,
    // for example "ai" or "backend".
    public string? FailureSource { get; set; }

    public string ScenarioSnapshotJson { get; set; } = "{}";

    public OptimisationResult? Result { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}