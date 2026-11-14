namespace AquaBlend.DTOs.Runs;

/// <summary>
/// POST /api/scenarios/{scenarioId}/runs request body. Optional — an absent/null body defaults
/// ForceRerun to false, so existing callers that POST no body keep working unchanged
/// (AquaBlend_Backend_Final_Integration_Implementation.md §13A).
/// </summary>
public class CreateRunRequestDto
{
    public bool ForceRerun { get; set; } = false;
}
