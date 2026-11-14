namespace AquaBlend.Entities;

public class Run
{
    public int Id { get; set; }

    // Public API identifier (integration.md run_id) — distinct from Scenario.ExternalId.
    public string ExternalId { get; set; } = string.Empty;

    public int ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;

    // Pipeline position — see integration.md §25 and Domain/RunWorkflowStatuses.cs. Kept separate
    // from SolverOutcome, which is the mathematical result once one exists.
    public string WorkflowStatus { get; set; } = "queued";

    // optimal | infeasible — null until the solver actually produces an outcome.
    public string? SolverOutcome { get; set; }

    public string? ProgressMessage { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }

    public double? SolveTimeMs { get; set; }
    public decimal? ObjectiveValue { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Set by this API at creation time; never used here to decide a cache hit (AquaBlend_Backend_
    // Final_Integration_Implementation.md §14) — only the Python MILP worker, once it has the real
    // ModelParameters, may honour it.
    public bool ForceRerun { get; set; }

    // Always false as created by this API. Only the MILP worker (MilpCacheHit) and the AI
    // service/worker (AiCacheHit) ever set these true, after they decide to reuse a prior result.
    public bool MilpCacheHit { get; set; }
    public bool AiCacheHit { get; set; }

    // Assigned by RunService.CreateAsync in the same transaction as the Run row, immediately
    // after MilpInputSnapshotService creates the pending snapshot. Never null on a committed run.
    public Guid? MilpInputId { get; set; }
    public MilpModelInput? MilpInput { get; set; }

    // Populated later by the MILP worker once milp_model_output exists for this run.
    public Guid? MilpOutputId { get; set; }
    public MilpModelOutput? MilpOutput { get; set; }

    // Populated later by the AI service/worker once milp_ai_output exists for this run.
    public Guid? AiOutputId { get; set; }
    public MilpAiOutput? AiOutput { get; set; }

    // Set by the MILP/AI worker when it reuses a prior run's output instead of recomputing.
    public int? ReusedMilpFromRunId { get; set; }
    public int? ReusedAiFromRunId { get; set; }

    public DateTime? MilpStartedAt { get; set; }
    public DateTime? MilpCompletedAt { get; set; }
    public DateTime? AiStartedAt { get; set; }
    public DateTime? AiCompletedAt { get; set; }

    // Legacy compatibility store only (AquaBlend_Backend_Final_Integration_Implementation.md
    // §18) — new runs are read via MilpOutputId -> milp_model_output; this collection remains
    // only so pre-existing rows (e.g. RUN-1001) stay readable.
    public ICollection<OptimisationResult> OptimisationResults { get; set; } = new List<OptimisationResult>();
}
