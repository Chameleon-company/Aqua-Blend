namespace AquaBlend.Entities;

public class SourcePlantLink
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;

    public int SourceId { get; set; }
    public WaterSource Source { get; set; } = null!;

    public int PlantId { get; set; }
    public Plant Plant { get; set; } = null!;

    public bool Enabled { get; set; } = true;
    public double? DefaultCapacityMlPerDay { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
