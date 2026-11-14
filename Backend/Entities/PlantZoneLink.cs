namespace AquaBlend.Entities;

public class PlantZoneLink
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;

    public int PlantId { get; set; }
    public Plant Plant { get; set; } = null!;

    public int ZoneId { get; set; }
    public DemandZone Zone { get; set; } = null!;

    public bool Enabled { get; set; } = true;
    public double? DefaultCapacityMlPerDay { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
