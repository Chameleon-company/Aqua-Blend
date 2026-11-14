namespace AquaBlend.Entities;

/// <summary>
/// Maps to public.milp_model_input (snake_case, live-Supabase-owned table — see
/// AquaBlend_Backend_Final_Integration_Implementation.md §6 and Data/AquaBlendDbContext.cs for
/// the explicit column mapping). One immutable snapshot per Run, created by
/// Services/MilpInputSnapshotService.cs inside the same transaction as the Run row.
///
/// frontend_input_json / canonical_input_json are frozen at creation time and must never be
/// rewritten by a later Scenario edit. scenario_data_json, model_parameters_json, every runtime
/// hash, and resolved_at are Python-worker-owned and stay NULL until data_loader.py /
/// preprocessing.py populate them — this backend must never fabricate them.
/// </summary>
public class MilpModelInput
{
    public Guid Id { get; set; }

    public int RunId { get; set; }
    public Run Run { get; set; } = null!;

    public int ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;

    public string RunExternalId { get; set; } = string.Empty;
    public string ScenarioExternalId { get; set; } = string.Empty;

    public string InputStatus { get; set; } = "pending";
    public string InputContractVersion { get; set; } = "1.0";
    public string? MilpModelVersion { get; set; }

    public string ScenarioName { get; set; } = string.Empty;
    public string ScenarioStatus { get; set; } = string.Empty;

    public string? DataSourceType { get; set; }
    public string? DataSourceView { get; set; }
    public bool AllowEstimatedValues { get; set; }

    public bool FailIfSourceMissingFromDatabase { get; set; }
    public bool FailIfDailyAvailabilityMissing { get; set; }
    public bool FailIfRequiredQualityValueMissing { get; set; }
    public bool FailIfDemandMissing { get; set; }

    // JSONB, stored as raw JSON text (matches the existing Scenario.FormStateJson /
    // OptimisationResult.ResultJson convention — see Data/AquaBlendDbContext.cs).
    public string Sources { get; set; } = "[]";
    public string Plants { get; set; } = "[]";
    public string DemandZones { get; set; } = "[]";
    public string SourceToPlantLinks { get; set; } = "[]";
    public string PlantToZoneLinks { get; set; } = "[]";
    public string QualityLimits { get; set; } = "null";
    public string ValidationPolicy { get; set; } = "{}";

    public string FrontendInputJson { get; set; } = "{}";
    public string CanonicalInputJson { get; set; } = "{}";
    public string SourceDataSnapshotJson { get; set; } = "[]";

    // Python-owned — see AquaBlend_Backend_Final_Integration_Implementation.md §6/§14. Must
    // remain NULL until data_loader.py / preprocessing.py populate them.
    public string? ScenarioDataJson { get; set; }
    public string? ModelParametersJson { get; set; }

    public string SolverConfigJson { get; set; } = "{}";

    // Runtime hashes/execution key — Python-worker-owned, never fabricated here.
    public string? CanonicalInputHash { get; set; }
    public string? ScenarioDataHash { get; set; }
    public string? ModelParametersHash { get; set; }
    public string? InputHash { get; set; }
    public string? SolverConfigHash { get; set; }
    public string? ExecutionKey { get; set; }

    public string ScenarioDataSchemaVersion { get; set; } = "1.0";
    public string ModelParametersSchemaVersion { get; set; } = "1.0";

    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
