using System.Text.Json;

namespace AquaBlend.DTOs.Milp;

/// <summary>
/// Read-only projection of Entities/MilpModelOutput.cs (AquaBlend_Backend_Final_Integration_
/// Implementation.md §17) plus a legacy-fallback flag. RawOutputJson is the authoritative
/// serialized SolvedScenario; every other field here is a flattened projection of it, present
/// purely for convenient querying/display.
/// </summary>
public class MilpModelOutputDto
{
    public string Id { get; set; } = string.Empty;

    // Marks a response synthesized from the legacy public.OptimisationResults table because this
    // run predates milp_model_output (AquaBlend_Backend_Final_Integration_Implementation.md §18)
    // — never true for a real milp_model_output row.
    public bool IsLegacyFallback { get; set; }

    public string? SchemaVersion { get; set; }
    public string? ScenarioExternalId { get; set; }
    public string? ScenarioStatus { get; set; }

    public string? ExecutionKey { get; set; }
    public string? InputHash { get; set; }
    public string? ModelParametersHash { get; set; }

    public string? MilpModelVersion { get; set; }
    public string? SolverName { get; set; }
    public string? SolverVersion { get; set; }
    public string? SolverConfigHash { get; set; }

    public string? SolverTerminationCondition { get; set; }
    public string? SolverMessage { get; set; }
    public double? SolveTimeMs { get; set; }

    public JsonElement RawOutputJson { get; set; }
    public string? OutputHash { get; set; }

    public bool CacheReusable { get; set; }
    public bool ForcedRecompute { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public string? LoaderStatus { get; set; }
    public bool? LoaderScenarioReady { get; set; }
    public JsonElement? LoaderValidationIssues { get; set; }
    public JsonElement? LoaderChecks { get; set; }

    public string? PreprocessingStatus { get; set; }
    public JsonElement? PreprocessingWarnings { get; set; }
    public JsonElement? PreprocessingChecks { get; set; }

    public string? OutputConsistencyStatus { get; set; }
    public double? OutputConsistencyTolerance { get; set; }
    public JsonElement? OutputConsistencyChecks { get; set; }

    public string? SolverStatus { get; set; }
    public bool? SolverIsFeasible { get; set; }
    public bool? SolverIsOptimal { get; set; }
    public double? SolverObjectiveValue { get; set; }

    public double? TotalDemandMlPerDay { get; set; }
    public double? TotalWithdrawalMlPerDay { get; set; }
    public double? TotalTreatedMlPerDay { get; set; }
    public double? TotalDeliveredMlPerDay { get; set; }

    public int? SelectedSourceCount { get; set; }
    public int? ActivePlantCount { get; set; }

    public double? TotalSourceFixedCost { get; set; }
    public double? TotalSourceVariableCost { get; set; }
    public double? TotalPlantFixedCost { get; set; }
    public double? TotalPlantVariableCost { get; set; }
    public double? ReconstructedTotalCost { get; set; }
    public double? TotalCost { get; set; }
    public bool? CostReconciles { get; set; }

    public JsonElement? Sources { get; set; }
    public JsonElement? Plants { get; set; }
    public JsonElement? DemandZones { get; set; }
    public JsonElement? FlowsSourceToPlant { get; set; }
    public JsonElement? FlowsPlantToZone { get; set; }
    public JsonElement? Quality { get; set; }
    public JsonElement? BindingConstraintsSummary { get; set; }
    public JsonElement? Warnings { get; set; }
}
