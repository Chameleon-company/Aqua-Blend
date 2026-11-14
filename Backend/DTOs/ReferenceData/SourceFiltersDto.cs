namespace AquaBlend.DTOs.ReferenceData;

/// <summary>Bound from query string on GET /api/sources — mirrors frontend SourceFilters.</summary>
public class SourceFiltersDto
{
    public string? SourceType { get; set; }
    public string? Availability { get; set; }
    public bool? ModelReady { get; set; }

    // "estimated" | "measured" | "all"
    public string? EstimatedOrMeasured { get; set; }
}
