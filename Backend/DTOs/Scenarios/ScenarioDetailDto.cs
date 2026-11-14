namespace AquaBlend.DTOs.Scenarios;

/// <summary>Server-owned fields layered on top of the editable form state — mirrors
/// Frontend/src/types/scenario.ts's ScenarioDetail (which extends ScenarioFormState).</summary>
public class ScenarioDetailDto
{
    public string ScenarioId { get; set; } = string.Empty;
    public string ScenarioName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<ScenarioSourceSelectionDto> Sources { get; set; } = new();
    public List<ScenarioPlantSelectionDto> Plants { get; set; } = new();
    public List<ScenarioDemandSelectionDto> DemandZones { get; set; } = new();
    public string? QualityProfileId { get; set; }
    public List<NetworkOverrideDto> NetworkOverrides { get; set; } = new();

    // "draft" | "ready" | "invalid" | "archived"
    public string Status { get; set; } = "draft";
    public List<ValidationIssueDto> ValidationIssues { get; set; } = new();

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
