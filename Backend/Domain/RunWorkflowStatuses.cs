namespace AquaBlend.Domain;

/// <summary>
/// Single source of truth for Run.WorkflowStatus string values (integration.md §5). The backend
/// only ever assigns <see cref="Queued"/> at run-creation time — every later transition
/// (preparing_input -> milp_running -> milp_completed -> ai_queued -> ai_running -> completed /
/// completed_with_ai_error) is owned by the Python MILP worker and the AI service/worker, not
/// by this API.
/// </summary>
public static class RunWorkflowStatuses
{
    public const string Queued = "queued";
    public const string PreparingInput = "preparing_input";
    public const string MilpRunning = "milp_running";
    public const string MilpCompleted = "milp_completed";
    public const string AiQueued = "ai_queued";
    public const string AiRunning = "ai_running";
    public const string Completed = "completed";
    public const string CompletedWithAiError = "completed_with_ai_error";
    public const string Failed = "failed";
}
