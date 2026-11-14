namespace AquaBlend.Entities;

public class QualityProfile
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public ICollection<QualityParameter> Parameters { get; set; } = new List<QualityParameter>();
}
