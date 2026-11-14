using System.Text.Json.Serialization;

namespace AquaBlend.DTOs.ReferenceData;

public class SourceQualityDto
{
    [JsonPropertyName("pH")]
    public double? PH { get; set; }
    public double? AlkalinityMgPerLCaCO3 { get; set; }
    public double? TurbidityNtu { get; set; }
}

public class SourceRefDto
{
    public string SourceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? SourceType { get; set; }
    public string? AvailabilityStatus { get; set; }
    public bool? ModelReady { get; set; }
    public double? DefaultMinWithdrawalMlPerDay { get; set; }
    public double? DefaultMaxWithdrawalMlPerDay { get; set; }
    public decimal? Cost { get; set; }
    public SourceQualityDto? Quality { get; set; }
    public bool? IsEstimated { get; set; }
    public string? Provenance { get; set; }
}
