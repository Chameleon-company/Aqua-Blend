namespace AquaBlend.Entities;

/// <summary>
/// Maps to public.milp_ai_output (AquaBlend_Backend_Final_Integration_Implementation.md §8).
/// Written exclusively by the AI service/worker — this backend only reads it (via
/// Run.AiOutputId) for the aggregate run endpoint. The exact AI contract is not finalized yet;
/// this maps the live columns accurately and exposes raw_ai_json safely without inventing any
/// AI-processing behavior here.
/// </summary>
public class MilpAiOutput
{
    public Guid Id { get; set; }

    public int? OriginRunId { get; set; }
    public Run? OriginRun { get; set; }

    public Guid MilpOutputId { get; set; }
    public MilpModelOutput MilpOutput { get; set; } = null!;

    public int ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;

    public string Status { get; set; } = "pending";

    public string? AiProvider { get; set; }
    public string? AiModel { get; set; }
    public string? AiModelVersion { get; set; }
    public string? PromptVersion { get; set; }
    public string? AnalysisVersion { get; set; }
    public string AiContractVersion { get; set; } = "1.0";

    public string? MilpOutputHash { get; set; }
    public string? AiCacheKey { get; set; }

    public string AiInputJson { get; set; } = "{}";

    public string? ExecutiveSummary { get; set; }
    public string? DecisionExplanation { get; set; }

    public string? KeyFindings { get; set; }
    public string? Anomalies { get; set; }
    public string? Recommendations { get; set; }
    public string? Warnings { get; set; }
    public string? RiskAssessment { get; set; }
    public string? SourceAnalysis { get; set; }
    public string? PlantAnalysis { get; set; }
    public string? QualityAnalysis { get; set; }
    public string? Limitations { get; set; }

    public string? RawAiJson { get; set; }
    public string? AiOutputHash { get; set; }

    public bool CacheReusable { get; set; } = true;
    public bool ForcedRecompute { get; set; }

    public double? LatencyMs { get; set; }
    public int? PromptTokens { get; set; }
    public int? CompletionTokens { get; set; }
    public int? TotalTokens { get; set; }

    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
