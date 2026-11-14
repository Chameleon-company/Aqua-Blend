using System.ComponentModel.DataAnnotations;

namespace AquaBlend.DTOs.ReferenceData;

/// <summary>Request body for POST/PUT /api/sources.</summary>
public class SourceWriteDto
{
    [Required]
    [RegularExpression(@".*\S.*", ErrorMessage = "Name cannot contain only whitespace.")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@".*\S.*", ErrorMessage = "SourceType cannot contain only whitespace.")]
    [MaxLength(50)]
    public string SourceType { get; set; } = string.Empty;

    [MaxLength(50)]
    public string AvailabilityStatus { get; set; } = "available";

    public bool ModelReady { get; set; } = true;

    public double? DefaultMinWithdrawalMlPerDay { get; set; }
    public double? DefaultMaxWithdrawalMlPerDay { get; set; }
    public decimal? CostPerMl { get; set; }
    public SourceQualityDto? Quality { get; set; }
    public bool IsEstimated { get; set; }

    [MaxLength(200)]
    public string? Provenance { get; set; }
}
