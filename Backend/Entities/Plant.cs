namespace AquaBlend.Entities;

public class Plant
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double? DefaultMinCapacityMlPerDay { get; set; }
    public double? DefaultMaxCapacityMlPerDay { get; set; }
    public decimal? FixedActivationCost { get; set; }
    public decimal? TreatmentCostPerMlPerDay { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<SourcePlantLink> SourcePlantLinks { get; set; } = new List<SourcePlantLink>();
    public ICollection<PlantZoneLink> PlantZoneLinks { get; set; } = new List<PlantZoneLink>();
}
