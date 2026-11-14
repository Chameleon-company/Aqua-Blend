namespace AquaBlend.DTOs.ReferenceData;

public class NetworkLinkRefDto
{
    public string LinkId { get; set; } = string.Empty;

    // "source_to_plant" | "plant_to_zone"
    public string Kind { get; set; } = string.Empty;

    public string FromId { get; set; } = string.Empty;
    public string? FromName { get; set; }
    public string ToId { get; set; } = string.Empty;
    public string? ToName { get; set; }
    public double? DefaultCapacityMlPerDay { get; set; }
}
