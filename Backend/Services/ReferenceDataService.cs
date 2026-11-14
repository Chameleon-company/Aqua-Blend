using AquaBlend.Data;
using AquaBlend.DTOs.ReferenceData;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services;

/// <summary>
/// Read-only reference data the scenario builder consumes but never writes: plants, demand
/// zones, network topology, and water-quality profiles. Sources have their own service
/// (WaterSourceService) because they still support admin CRUD; these do not yet.
/// </summary>
public class ReferenceDataService
{
    private readonly AquaBlendDbContext _context;

    public ReferenceDataService(AquaBlendDbContext context)
    {
        _context = context;
    }

    public async Task<List<PlantRefDto>> GetPlantsAsync()
    {
        return await _context.Plants
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .Select(p => new PlantRefDto
            {
                PlantId = p.ExternalId,
                Name = p.Name,
                DefaultMinCapacityMlPerDay = p.DefaultMinCapacityMlPerDay,
                DefaultMaxCapacityMlPerDay = p.DefaultMaxCapacityMlPerDay,
                FixedActivationCost = p.FixedActivationCost,
                TreatmentCostPerMlPerDay = p.TreatmentCostPerMlPerDay,
            })
            .ToListAsync();
    }

    public async Task<List<DemandZoneRefDto>> GetDemandZonesAsync()
    {
        return await _context.DemandZones
            .AsNoTracking()
            .OrderBy(z => z.Name)
            .Select(z => new DemandZoneRefDto
            {
                ZoneId = z.ExternalId,
                Name = z.Name,
            })
            .ToListAsync();
    }

    public async Task<List<QualityProfileDto>> GetQualityProfilesAsync()
    {
        var profiles = await _context.QualityProfiles
            .AsNoTracking()
            .Include(p => p.Parameters)
            .OrderBy(p => p.Name)
            .ToListAsync();

        return profiles.Select(p => new QualityProfileDto
        {
            ProfileId = p.ExternalId,
            Name = p.Name,
            Description = p.Description,
            Parameters = p.Parameters.Select(param => new QualityParameterDefDto
            {
                ParameterId = param.ParameterId,
                Label = param.Label,
                Unit = param.Unit,
                LowerLimit = param.LowerLimit,
                UpperLimit = param.UpperLimit,
            }).ToList(),
        }).ToList();
    }

    public async Task<List<NetworkLinkRefDto>> GetNetworkLinksAsync()
    {
        var sourcePlantLinks = await _context.SourcePlantLinks
            .AsNoTracking()
            .Include(l => l.Source)
            .Include(l => l.Plant)
            .Where(l => l.Enabled)
            .Select(l => new NetworkLinkRefDto
            {
                LinkId = l.ExternalId,
                Kind = "source_to_plant",
                FromId = l.Source.ExternalId,
                FromName = l.Source.Name,
                ToId = l.Plant.ExternalId,
                ToName = l.Plant.Name,
                DefaultCapacityMlPerDay = l.DefaultCapacityMlPerDay,
            })
            .ToListAsync();

        var plantZoneLinks = await _context.PlantZoneLinks
            .AsNoTracking()
            .Include(l => l.Plant)
            .Include(l => l.Zone)
            .Where(l => l.Enabled)
            .Select(l => new NetworkLinkRefDto
            {
                LinkId = l.ExternalId,
                Kind = "plant_to_zone",
                FromId = l.Plant.ExternalId,
                FromName = l.Plant.Name,
                ToId = l.Zone.ExternalId,
                ToName = l.Zone.Name,
                DefaultCapacityMlPerDay = l.DefaultCapacityMlPerDay,
            })
            .ToListAsync();

        return sourcePlantLinks.Concat(plantZoneLinks).ToList();
    }
}
