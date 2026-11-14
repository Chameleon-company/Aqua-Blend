using System.Text.Json;

namespace AquaBlend.DTOs.Ai;

/// <summary>
/// Read-only projection of Entities/MilpAiOutput.cs. The AI contract is not finalized yet
/// (AquaBlend_Backend_Final_Integration_Implementation.md §8/§17) — this maps the live columns
/// accurately and exposes raw_ai_json safely without inventing any AI-processing behavior here.
/// </summary>
public class MilpAiOutputDto
{
    public string Id { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? AiProvider { get; set; }
    public string? AiModel { get; set; }
    public string? AiModelVersion { get; set; }
    public string? PromptVersion { get; set; }
    public string? AnalysisVersion { get; set; }
    public string AiContractVersion { get; set; } = string.Empty;

    public string? MilpOutputHash { get; set; }
    public string? AiCacheKey { get; set; }

    public JsonElement AiInputJson { get; set; }

    public string? ExecutiveSummary { get; set; }
    public string? DecisionExplanation { get; set; }

    public JsonElement? KeyFindings { get; set; }
    public JsonElement? Anomalies { get; set; }
    public JsonElement? Recommendations { get; set; }
    public JsonElement? Warnings { get; set; }
    public JsonElement? RiskAssessment { get; set; }
    public JsonElement? SourceAnalysis { get; set; }
    public JsonElement? PlantAnalysis { get; set; }
    public JsonElement? QualityAnalysis { get; set; }
    public JsonElement? Limitations { get; set; }

    public JsonElement? RawAiJson { get; set; }
    public string? AiOutputHash { get; set; }

    public bool CacheReusable { get; set; }
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
