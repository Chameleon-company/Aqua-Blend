using System.Text.Json;

namespace AquaBlend.DTOs.Milp;

/// <summary>
/// Read-only projection of Entities/MilpModelInput.cs. JSONB columns are exposed as
/// <see cref="JsonElement"/> (not string, not object/dynamic) so they embed as real nested JSON
/// in the aggregate response instead of a doubly-escaped string — the same convention already
/// used by DTOs/Runs/OptimisationResultIngestDto.cs's Result property.
/// </summary>
public class MilpModelInputDto
{
    public string Id { get; set; } = string.Empty;

    public string InputStatus { get; set; } = string.Empty;
    public string InputContractVersion { get; set; } = string.Empty;
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

    public JsonElement Sources { get; set; }
    public JsonElement Plants { get; set; }
    public JsonElement DemandZones { get; set; }
    public JsonElement SourceToPlantLinks { get; set; }
    public JsonElement PlantToZoneLinks { get; set; }
    public JsonElement QualityLimits { get; set; }
    public JsonElement ValidationPolicy { get; set; }

    public JsonElement FrontendInputJson { get; set; }
    public JsonElement CanonicalInputJson { get; set; }
    public JsonElement SourceDataSnapshotJson { get; set; }

    // NULL until the Python worker populates them — never fabricated by this backend.
    public JsonElement? ScenarioDataJson { get; set; }
    public JsonElement? ModelParametersJson { get; set; }

    public JsonElement SolverConfigJson { get; set; }

    public string? CanonicalInputHash { get; set; }
    public string? ScenarioDataHash { get; set; }
    public string? ModelParametersHash { get; set; }
    public string? InputHash { get; set; }
    public string? SolverConfigHash { get; set; }
    public string? ExecutionKey { get; set; }

    public string ScenarioDataSchemaVersion { get; set; } = string.Empty;
    public string ModelParametersSchemaVersion { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
