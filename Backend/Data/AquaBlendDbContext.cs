using Microsoft.EntityFrameworkCore;
using AquaBlend.Entities;

namespace AquaBlend.Data;

public class AquaBlendDbContext : DbContext
{
    public AquaBlendDbContext(DbContextOptions<AquaBlendDbContext> options) : base(options)
    {
    }

    public DbSet<WaterSource> WaterSources => Set<WaterSource>();
    public DbSet<Scenario> Scenarios => Set<Scenario>();

    public override int SaveChanges()
    {
        ApplyTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTimestamps()
    {
        var currentTime = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Metadata.FindProperty("CreatedAt") is not null)
                {
                    entry.Property("CreatedAt").CurrentValue = currentTime;
                }

                if (entry.Metadata.FindProperty("UpdatedAt") is not null)
                {
                    entry.Property("UpdatedAt").CurrentValue = currentTime;
                }
            }

            if (entry.State == EntityState.Modified &&
                entry.Metadata.FindProperty("UpdatedAt") is not null)
            {
                entry.Property("UpdatedAt").CurrentValue = currentTime;
            }
        }
    }
}