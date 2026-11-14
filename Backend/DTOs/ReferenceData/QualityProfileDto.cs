namespace AquaBlend.DTOs.ReferenceData;

public class QualityParameterDefDto
{
    public string ParameterId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public double? LowerLimit { get; set; }
    public double? UpperLimit { get; set; }
}

public class QualityProfileDto
{
    public string ProfileId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<QualityParameterDefDto> Parameters { get; set; } = new();
}
