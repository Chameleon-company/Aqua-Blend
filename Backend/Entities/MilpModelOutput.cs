namespace AquaBlend.Entities;

/// <summary>
/// Maps to public.milp_model_output (AquaBlend_Backend_Final_Integration_Implementation.md §7).
/// Written exclusively by the MILP worker — this backend only ever reads it (via Run.MilpOutputId)
/// for the aggregate run endpoint. raw_output_json is the authoritative serialized
/// SolvedScenario; every other column here is a flattened projection of it for querying/reporting
/// and must never be used to regenerate raw_output_json.
/// </summary>
public class MilpModelOutput
{
    public Guid Id { get; set; }

    public int? OriginRunId { get; set; }
    public Run? OriginRun { get; set; }

    public Guid? InputId { get; set; }
    public MilpModelInput? Input { get; set; }

    public int? ScenarioDbId { get; set; }
    public Scenario? Scenario { get; set; }

    public string? SchemaVersion { get; set; }

    // The canonical scenario_id string (public.milp_model_output.scenario_id varchar) — distinct
    // from ScenarioDbId, which is the internal Scenarios.Id FK.
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

    // Authoritative raw MILP result — the exact serialized SolvedScenario.
    public string RawOutputJson { get; set; } = "{}";
    public string? OutputHash { get; set; }

    public bool CacheReusable { get; set; } = true;
    public bool ForcedRecompute { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    // Flattened output projections — preserved verbatim from the original detailed MILP result
    // shape (AquaBlend_Backend_Final_Integration_Implementation.md §7).
    public string? LoaderStatus { get; set; }
    public bool? LoaderScenarioReady { get; set; }
    public string? LoaderValidationIssues { get; set; }
    public string? LoaderChecks { get; set; }

    public string? PreprocessingStatus { get; set; }
    public string? PreprocessingWarnings { get; set; }
    public string? PreprocessingChecks { get; set; }

    public string? OutputConsistencyStatus { get; set; }
    public double? OutputConsistencyTolerance { get; set; }
    public string? OutputConsistencyChecks { get; set; }

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

    public string? Sources { get; set; }
    public string? Plants { get; set; }
    public string? DemandZones { get; set; }
    public string? FlowsSourceToPlant { get; set; }
    public string? FlowsPlantToZone { get; set; }
    public string? Quality { get; set; }
    public string? BindingConstraintsSummary { get; set; }
    public string? Warnings { get; set; }
}
