namespace AquaBlend.Entities;

public class DemandZone
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<PlantZoneLink> PlantZoneLinks { get; set; } = new List<PlantZoneLink>();
}
