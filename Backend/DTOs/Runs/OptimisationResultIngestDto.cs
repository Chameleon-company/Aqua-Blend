using System.Text.Json;

namespace AquaBlend.DTOs.Runs;

/// <summary>
/// POST /api/optimisation-results request body. This is what the eventual real MILP service
/// will call once it exists. The exact Results JSON contract is not locked yet
/// (integration.md §15/§33), so the raw payload is stored as-is in ResultJson and only the
/// fields needed to drive Run/OptimisationResult bookkeeping are extracted explicitly.
/// </summary>
public class OptimisationResultIngestDto
{
    public string RunId { get; set; } = string.Empty;
    public string ScenarioId { get; set; } = string.Empty;

    // OPTIMAL | FEASIBLE | INFEASIBLE | FAILED
    public string Status { get; set; } = string.Empty;

    public DateTime? SolvedAt { get; set; }
    public string ContractVersion { get; set; } = "1.0";
    public decimal? TotalCost { get; set; }
    public string? Currency { get; set; }
    public double? SolveTimeMs { get; set; }

    // The full raw result document, exactly as the solver produced it.
    public JsonElement Result { get; set; }
}
