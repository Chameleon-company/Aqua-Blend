using System.Text.Json.Serialization;

namespace AquaBlend.Contracts.Milp;

/// <summary>
/// The canonical MILP scenario document — the exact shape persisted into
/// Scenario.FormStateJson (via Services/CanonicalScenarioBuilder.cs, serialised with
/// DTOs/Common/MilpJsonDefaults.cs's snake_case policy) and the shape
/// MILP/src/data_loader.py's load_scenario() consumes directly, without a frontend-schema
/// adapter. Field names/nesting match the verified loader contract
/// (see AquaBlend_Claude_Canonical_Scenario_JSON.md) exactly — do not rename without also
/// updating the merged MILP loader.
/// </summary>
public sealed class CanonicalMilpScenario
{
    public string ScenarioId { get; set; } = string.Empty;
    public string ScenarioName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public MilpDataSource DataSource { get; set; } = new();
    public MilpValidationPolicy Validation { get; set; } = new();
    public List<MilpScenarioSource> Sources { get; set; } = new();
    public MilpNetwork Network { get; set; } = new();

    // Null only for a genuinely incomplete draft that has no quality profile selected yet
    // (Services/CanonicalScenarioBuilder.cs never fabricates a quality_limits object). A
    // scenario in this state cannot pass Services/ScenarioService.cs's ValidateAsync gate.
    public MilpQualityLimits? QualityLimits { get; set; }

    // Metadata the MILP loader ignores (it only reads the keys above). Lets
    // Services/ScenarioJsonAdapter.cs restore which quality profile the user picked without
    // trying to reverse-derive a profile ID from resolved parameter bounds.
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? QualityProfileId { get; set; }
}

public sealed class MilpDataSource
{
    public string Type { get; set; } = "supabase";
    public string View { get; set; } = "public.source_model_inputs";
    public bool AllowEstimatedValues { get; set; } = true;
}

public sealed class MilpValidationPolicy
{
    public bool FailIfSourceMissingFromDatabase { get; set; } = true;
    public bool FailIfDailyAvailabilityMissing { get; set; } = true;
    public bool FailIfRequiredQualityValueMissing { get; set; } = true;
    public bool FailIfDemandMissing { get; set; } = true;
}

/// <summary>
/// A scenario's reference to a real public.source_model_inputs row plus the scenario-specific
/// overrides applied to it. Deliberately does NOT duplicate source name/type/cost/quality/
/// availability/provenance — the MILP loader hydrates those itself from the database.
/// </summary>
public sealed class MilpScenarioSource
{
    public string SourceId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public bool ForcedInactive { get; set; }
    public double? MinimumWithdrawalMlPerDayOverride { get; set; }
    public double? MaximumWithdrawalMlPerDayOverride { get; set; }

    // No per-source fixed-activation-cost field exists in reference data (WaterSource entity);
    // 0.0 is the documented MILP contract default for this field, not a fabricated fallback.
    public double FixedActivationCost { get; set; }
}

public sealed class MilpNetwork
{
    public List<MilpPlant> Plants { get; set; } = new();
    public List<MilpDemandZone> DemandZones { get; set; } = new();
    public List<MilpSourceToPlantLink> SourceToPlantLinks { get; set; } = new();
    public List<MilpPlantToZoneLink> PlantToZoneLinks { get; set; } = new();
}

/// <summary>Fully resolved plant record (reference data + user override already applied) —
/// never carries an "override" field; see CanonicalScenarioBuilder.ResolvePlants.</summary>
public sealed class MilpPlant
{
    public string PlantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public double MinimumProcessingCapacityMlPerDay { get; set; }
    public double MaximumProcessingCapacityMlPerDay { get; set; }
    public double FixedActivationCost { get; set; }
    public double TreatmentCostPerMl { get; set; }
}

public sealed class MilpDemandZone
{
    public string ZoneId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    // Nullable only to preserve the existing "save an incomplete draft, demand entered later"
    // UX (Services/ScenarioService.cs's ValidateAsync already treats null demand as a blocking
    // validation issue, not a save-time rejection). A scenario in this state cannot pass
    // ValidateAsync, so it can never reach the MILP loader with a null value.
    public double? DemandMlPerDay { get; set; }
}

public sealed class MilpSourceToPlantLink
{
    public string SourceId { get; set; } = string.Empty;
    public string PlantId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public double MaximumFlowMlPerDay { get; set; }
}

public sealed class MilpPlantToZoneLink
{
    public string PlantId { get; set; } = string.Empty;
    public string ZoneId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public double MaximumFlowMlPerDay { get; set; }
}

public sealed class MilpQualityLimits
{
    public string AppliesTo { get; set; } = "blend_at_plant_inflow";

    // Keyed by parameter_id ("pH", "alkalinity", "turbidity") — dictionary keys are data, not
    // schema field names, so MilpJsonDefaults' snake_case policy does not rewrite them.
    public Dictionary<string, MilpQualityParameter> Parameters { get; set; } = new();
}

public sealed class MilpQualityParameter
{
    public string Unit { get; set; } = string.Empty;
    public double Min { get; set; }
    public double Max { get; set; }
    public string Transform { get; set; } = "identity";
    public string? SourceField { get; set; }

    // Only meaningful for a non-identity transform (e.g. ph_to_hydrogen_ion); omitted entirely for
    // "identity" parameters, matching the merged MILP contract's alkalinity/turbidity examples.
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ModelName { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ModelUnit { get; set; }
}
