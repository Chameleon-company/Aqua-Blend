namespace AquaBlend.DTOs.ReferenceData;

public class PlantRefDto
{
    public string PlantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double? DefaultMinCapacityMlPerDay { get; set; }
    public double? DefaultMaxCapacityMlPerDay { get; set; }
    public decimal? FixedActivationCost { get; set; }
    public decimal? TreatmentCostPerMlPerDay { get; set; }
}
