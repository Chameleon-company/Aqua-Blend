using AquaBlend.Entities;

namespace AquaBlend.Data;

public static class SeedData
{
    public static void Initialize(AquaBlendDbContext context)
    {
        if (context.WaterSources.Any()) return;

        context.WaterSources.AddRange(
            new WaterSource { Name = "Reservoir A", Type = "Surface"},
            new WaterSource { Name = "Bore Well 1", Type = "Groundwater"});

        context.Scenarios.AddRange(
            new Scenario { Name = "Drought Scenario", Description = "Low rainfall projection" }
        );

        context.SaveChanges();
    }
}