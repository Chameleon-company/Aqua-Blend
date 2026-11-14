using AquaBlend.DTOs.Ai;
using AquaBlend.DTOs.Milp;
using AquaBlend.DTOs.Scenarios;

namespace AquaBlend.DTOs.Runs;

/// <summary>
/// GET /api/runs/{runExternalId} response (AquaBlend_Backend_Final_Integration_Implementation.md
/// §15). Lets the frontend fetch one run's complete state in a single call instead of querying
/// milp_model_input/milp_model_output/milp_ai_output separately. Output sections are null until
/// the corresponding worker has produced them — that is a valid, expected shape for a
/// queued/in-progress run, not an error.
/// </summary>
public class RunAggregateDto
{
    public RunDto Run { get; set; } = new();
    public ScenarioDetailDto? Scenario { get; set; }
    public MilpModelInputDto? Input { get; set; }
    public MilpModelOutputDto? MilpOutput { get; set; }
    public MilpAiOutputDto? AiOutput { get; set; }
}
