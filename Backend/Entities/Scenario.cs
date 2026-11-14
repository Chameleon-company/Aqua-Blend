namespace AquaBlend.Entities;

public class Scenario
{
    public int Id { get; set; }

    // Public API identifier (integration.md scenario_id) — the int Id below never leaves the backend.
    public string ExternalId { get; set; } = string.Empty;

    public string Status { get; set; } = "draft";

    // The full ScenarioFormState (scenarioName, description, sources, plants, demandZones,
    // qualityProfileId, networkOverrides) is stored as one document rather than normalised
    // across tables — it represents "conditions being tested" (integration.md §10-11), not
    // canonical reference facts, so a versioned JSON snapshot is the correct shape for it.
    public string FormStateJson { get; set; } = "{}";

    public string ValidationIssuesJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Run> Runs { get; set; } = new List<Run>();
    public ICollection<OptimisationResult> OptimisationResults { get; set; } = new List<OptimisationResult>();
}
