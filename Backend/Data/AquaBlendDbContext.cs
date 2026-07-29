using Microsoft.EntityFrameworkCore;
using AquaBlend.Entities;

namespace AquaBlend.Data;

public class AquaBlendDbContext : DbContext
{
    public AquaBlendDbContext(DbContextOptions<AquaBlendDbContext> options) : base(options) { }

    public DbSet<WaterSource> WaterSources { get; set; }
    public DbSet<Scenario> Scenarios { get; set; }
}