using System.ComponentModel.DataAnnotations;

namespace AquaBlend.DTOs.Scenarios;

public class ScenarioSourceSelectionDto
{
    public string SourceId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public bool? ForcedInactive { get; set; }
    public double? MinWithdrawalOverrideMlPerDay { get; set; }
    public double? MaxWithdrawalOverrideMlPerDay { get; set; }
}

public class ScenarioPlantSelectionDto
{
    public string PlantId { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public double? MinCapacityOverrideMlPerDay { get; set; }
    public double? MaxCapacityOverrideMlPerDay { get; set; }
}

public class ScenarioDemandSelectionDto
{
    public string ZoneId { get; set; } = string.Empty;
    public double? DemandMlPerDay { get; set; }
}

public class NetworkOverrideDto
{
    public string LinkId { get; set; } = string.Empty;

    // "source_plant_outage" | "plant_zone_outage" | "capacity_override"
    public string Kind { get; set; } = string.Empty;

    public double? CapacityOverrideMlPerDay { get; set; }
}

/// <summary>
/// The complete set of user-editable scenario choices. Sent by the frontend on create/update
/// and stored verbatim as Scenario.FormStateJson — matches Frontend/src/types/scenario.ts's
/// ScenarioFormState field-for-field.
/// </summary>
public class ScenarioFormStateDto
{
    [Required]
    [RegularExpression(@".*\S.*", ErrorMessage = "Scenario name cannot contain only whitespace.")]
    [MaxLength(100)]
    public string ScenarioName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    public List<ScenarioSourceSelectionDto> Sources { get; set; } = new();
    public List<ScenarioPlantSelectionDto> Plants { get; set; } = new();
    public List<ScenarioDemandSelectionDto> DemandZones { get; set; } = new();
    public string? QualityProfileId { get; set; }
    public List<NetworkOverrideDto> NetworkOverrides { get; set; } = new();
}
