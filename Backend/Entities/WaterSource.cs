namespace AquaBlend.Entities;

public class WaterSource
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public string AvailabilityStatus { get; set; } = "available";
    public bool ModelReady { get; set; } = true;
    public double? DefaultMinWithdrawalMlPerDay { get; set; }
    public double? DefaultMaxWithdrawalMlPerDay { get; set; }
    public decimal? CostPerMl { get; set; }
    public double? QualityPH { get; set; }
    public double? QualityAlkalinityMgPerLCaCO3 { get; set; }
    public double? QualityTurbidityNtu { get; set; }
    public bool IsEstimated { get; set; }
    public string? Provenance { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<SourcePlantLink> SourcePlantLinks { get; set; } = new List<SourcePlantLink>();
}
