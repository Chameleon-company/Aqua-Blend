using System.Text.Json;
using AquaBlend.DTOs.Common;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using AquaBlend.Services;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Data;

public static class SeedData
{
    public static void Initialize(AquaBlendDbContext context)
    {
        var sources = SeedSources(context);
        var plants = SeedPlants(context);
        var zones = SeedDemandZones(context);
        SeedSourcePlantLinks(context, sources, plants);
        SeedPlantZoneLinks(context, plants, zones);
        SeedQualityProfile(context);

        var scenario = SeedScenario(context);
        var run = SeedRun(context, scenario);
        SeedOptimisationResult(context, scenario, run);
    }

    private static Dictionary<string, WaterSource> SeedSources(AquaBlendDbContext context)
    {
        var seeds = new[]
        {
            new WaterSource
            {
                ExternalId = "SRC_001", Name = "Silvan Reservoir", SourceType = "reservoir",
                AvailabilityStatus = "available", ModelReady = true,
                DefaultMinWithdrawalMlPerDay = 0, DefaultMaxWithdrawalMlPerDay = 250,
                CostPerMl = 400, QualityPH = 7.2, QualityAlkalinityMgPerLCaCO3 = 45, QualityTurbidityNtu = 1.2,
                IsEstimated = false, Provenance = "measured",
            },
            new WaterSource
            {
                ExternalId = "SRC_002", Name = "Yarra River, Kew", SourceType = "river",
                AvailabilityStatus = "available", ModelReady = true,
                DefaultMinWithdrawalMlPerDay = 0, DefaultMaxWithdrawalMlPerDay = 320,
                CostPerMl = 350, QualityPH = 7.5, QualityAlkalinityMgPerLCaCO3 = 52, QualityTurbidityNtu = 3.5,
                IsEstimated = false, Provenance = "measured",
            },
            new WaterSource
            {
                ExternalId = "SRC_003", Name = "Bore Well 1", SourceType = "groundwater",
                AvailabilityStatus = "available", ModelReady = true,
                DefaultMinWithdrawalMlPerDay = 0, DefaultMaxWithdrawalMlPerDay = 80,
                CostPerMl = 520, QualityPH = 6.9, QualityAlkalinityMgPerLCaCO3 = 110, QualityTurbidityNtu = 0.5,
                IsEstimated = true, Provenance = "estimated",
            },
        };

        foreach (var seed in seeds)
        {
            if (!context.WaterSources.Any(s => s.ExternalId == seed.ExternalId))
            {
                context.WaterSources.Add(seed);
            }
        }
        context.SaveChanges();

        return context.WaterSources.ToDictionary(s => s.ExternalId);
    }

    private static Dictionary<string, Plant> SeedPlants(AquaBlendDbContext context)
    {
        var seeds = new[]
        {
            new Plant
            {
                ExternalId = "PLANT_001", Name = "Treatment Plant 1",
                DefaultMinCapacityMlPerDay = 10, DefaultMaxCapacityMlPerDay = 400,
                FixedActivationCost = 5000, TreatmentCostPerMlPerDay = 80,
            },
            new Plant
            {
                ExternalId = "PLANT_002", Name = "Treatment Plant 2",
                DefaultMinCapacityMlPerDay = 10, DefaultMaxCapacityMlPerDay = 250,
                FixedActivationCost = 3500, TreatmentCostPerMlPerDay = 95,
            },
        };

        foreach (var seed in seeds)
        {
            if (!context.Plants.Any(p => p.ExternalId == seed.ExternalId))
            {
                context.Plants.Add(seed);
            }
        }
        context.SaveChanges();

        return context.Plants.ToDictionary(p => p.ExternalId);
    }

    private static Dictionary<string, DemandZone> SeedDemandZones(AquaBlendDbContext context)
    {
        var seeds = new[]
        {
            new DemandZone { ExternalId = "ZONE_001", Name = "North Zone" },
            new DemandZone { ExternalId = "ZONE_002", Name = "South Zone" },
        };

        foreach (var seed in seeds)
        {
            if (!context.DemandZones.Any(z => z.ExternalId == seed.ExternalId))
            {
                context.DemandZones.Add(seed);
            }
        }
        context.SaveChanges();

        return context.DemandZones.ToDictionary(z => z.ExternalId);
    }

    private static void SeedSourcePlantLinks(AquaBlendDbContext context, Dictionary<string, WaterSource> sources, Dictionary<string, Plant> plants)
    {
        var seeds = new (string LinkId, string SourceId, string PlantId, double Capacity)[]
        {
            ("LINK-SP-001", "SRC_001", "PLANT_001", 250),
            ("LINK-SP-002", "SRC_002", "PLANT_001", 200),
            ("LINK-SP-003", "SRC_002", "PLANT_002", 150),
            ("LINK-SP-004", "SRC_003", "PLANT_002", 80),
        };

        foreach (var (linkId, sourceId, plantId, capacity) in seeds)
        {
            if (!context.SourcePlantLinks.Any(l => l.ExternalId == linkId))
            {
                context.SourcePlantLinks.Add(new SourcePlantLink
                {
                    ExternalId = linkId,
                    SourceId = sources[sourceId].Id,
                    PlantId = plants[plantId].Id,
                    Enabled = true,
                    DefaultCapacityMlPerDay = capacity,
                });
            }
        }
        context.SaveChanges();
    }

    private static void SeedPlantZoneLinks(AquaBlendDbContext context, Dictionary<string, Plant> plants, Dictionary<string, DemandZone> zones)
    {
        var seeds = new (string LinkId, string PlantId, string ZoneId, double Capacity)[]
        {
            ("LINK-PZ-001", "PLANT_001", "ZONE_001", 300),
            ("LINK-PZ-002", "PLANT_001", "ZONE_002", 150),
            ("LINK-PZ-003", "PLANT_002", "ZONE_002", 200),
        };

        foreach (var (linkId, plantId, zoneId, capacity) in seeds)
        {
            if (!context.PlantZoneLinks.Any(l => l.ExternalId == linkId))
            {
                context.PlantZoneLinks.Add(new PlantZoneLink
                {
                    ExternalId = linkId,
                    PlantId = plants[plantId].Id,
                    ZoneId = zones[zoneId].Id,
                    Enabled = true,
                    DefaultCapacityMlPerDay = capacity,
                });
            }
        }
        context.SaveChanges();
    }

    // STANDARD_001's parameter bounds/transform metadata (integration.md quality-scaling PR):
    // pH is converted to a hydrogen-ion concentration for solver numerical stability
    // (nmol/L, not mol/L — see AquaBlend_Claude_Canonical_Scenario_JSON.md); alkalinity/turbidity
    // pass through unchanged. This is the single authoritative definition — the canonical scenario
    // builder (Services/CanonicalScenarioBuilder.cs) reads it from here, it does not hardcode it.
    private static readonly (string ParameterId, string Label, string Unit, double LowerLimit, double UpperLimit, string Transform, string SourceField, string? ModelName, string? ModelUnit)[] StandardQualityParameters =
    {
        ("pH", "pH", "pH", 6.5, 8.5, "ph_to_hydrogen_ion", "representative_ph", "hydrogen_ion_concentration_mol_l", "nmol/L"),
        ("alkalinity", "Alkalinity", "mg/L CaCO3", 20.0, 200.0, "identity", "representative_alkalinity_mg_l_caco3", null, null),
        ("turbidity", "Turbidity", "NTU", 0.5, 5.0, "identity", "representative_turbidity_ntu", null, null),
    };

    private static void SeedQualityProfile(AquaBlendDbContext context)
    {
        var profile = context.QualityProfiles
            .Include(q => q.Parameters)
            .FirstOrDefault(q => q.ExternalId == "STANDARD_001");

        if (profile is null)
        {
            profile = new QualityProfile
            {
                ExternalId = "STANDARD_001",
                Name = "Standard Water Quality",
                Description = "Default quality profile for public-data proof-of-concept scenarios.",
            };
            context.QualityProfiles.Add(profile);
        }

        // Reconcile rather than skip-if-exists: an older run of this seeder (or a stale local DB)
        // may have created STANDARD_001 without lower bounds / transform metadata. Upsert per
        // parameter so this profile is always complete and authoritative, never silently stale.
        foreach (var spec in StandardQualityParameters)
        {
            var parameter = profile.Parameters.FirstOrDefault(p => p.ParameterId == spec.ParameterId);
            if (parameter is null)
            {
                parameter = new QualityParameter { ParameterId = spec.ParameterId };
                profile.Parameters.Add(parameter);
            }

            parameter.Label = spec.Label;
            parameter.Unit = spec.Unit;
            parameter.LowerLimit = spec.LowerLimit;
            parameter.UpperLimit = spec.UpperLimit;
            parameter.Transform = spec.Transform;
            parameter.SourceField = spec.SourceField;
            parameter.ModelName = spec.ModelName;
            parameter.ModelUnit = spec.ModelUnit;
        }

        context.SaveChanges();
    }

    private static Scenario SeedScenario(AquaBlendDbContext context)
    {
        var existing = context.Scenarios.FirstOrDefault(s => s.ExternalId == "scenario_2026_07_17_001");
        if (existing is not null) return existing;

        var form = new ScenarioFormStateDto
        {
            ScenarioName = "Drought Scenario",
            Description = "Low rainfall projection",
            Sources = new List<ScenarioSourceSelectionDto>
            {
                new() { SourceId = "SRC_001", Enabled = true },
                new() { SourceId = "SRC_002", Enabled = true },
                new() { SourceId = "SRC_003", Enabled = false },
            },
            Plants = new List<ScenarioPlantSelectionDto>
            {
                new() { PlantId = "PLANT_001", Enabled = true },
                new() { PlantId = "PLANT_002", Enabled = true },
            },
            DemandZones = new List<ScenarioDemandSelectionDto>
            {
                new() { ZoneId = "ZONE_001", DemandMlPerDay = 300 },
                new() { ZoneId = "ZONE_002", DemandMlPerDay = 200 },
            },
            QualityProfileId = "STANDARD_001",
            NetworkOverrides = new List<NetworkOverrideDto>(),
        };

        var scenario = new Scenario
        {
            ExternalId = "scenario_2026_07_17_001",
            Status = "ready",
            ValidationIssuesJson = "[]",
        };

        // Seeded via the same canonical builder Services/ScenarioService.cs uses for a real
        // create — this row is proof the pipeline produces real canonical JSON from real
        // reference data (sources/plants/zones/links/quality profile seeded just above), not a
        // hand-written example. SeedData runs synchronously at startup, so this is the one place
        // that blocks on the async builder.
        var canonical = new CanonicalScenarioBuilder(context)
            .BuildAsync(scenario.ExternalId, scenario.Status, form)
            .GetAwaiter().GetResult();
        scenario.FormStateJson = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);

        context.Scenarios.Add(scenario);
        context.SaveChanges();
        return scenario;
    }

    private static Run SeedRun(AquaBlendDbContext context, Scenario scenario)
    {
        var existing = context.Runs.FirstOrDefault(r => r.ExternalId == "RUN-1001");
        if (existing is not null) return existing;

        var run = new Run
        {
            ExternalId = "RUN-1001",
            ScenarioId = scenario.Id,
            WorkflowStatus = "completed",
            SolverOutcome = "optimal",
            ObjectiveValue = 184150.00m,
            SolveTimeMs = 1180,
            CreatedAt = DateTime.Parse("2026-07-17T10:32:00Z").ToUniversalTime(),
        };

        context.Runs.Add(run);
        context.SaveChanges();
        return run;
    }

    private static void SeedOptimisationResult(AquaBlendDbContext context, Scenario scenario, Run run)
    {
        if (context.OptimisationResults.Any(r => r.RunId == run.Id))
            return;

        var resultJsonPath = Path.Combine(
            AppContext.BaseDirectory, "Data", "SeedData", "sample_optimisation_result.json");

        context.OptimisationResults.Add(new OptimisationResult
        {
            ScenarioId = scenario.Id,
            RunId = run.Id,
            Status = "OPTIMAL",
            SolvedAt = DateTime.Parse("2026-07-17T10:32:00Z").ToUniversalTime(),
            ReceivedAt = DateTime.UtcNow,
            ContractVersion = "1.0",
            TotalCost = 184150.00m,
            Currency = "AUD",
            ResultJson = File.ReadAllText(resultJsonPath),
        });

        context.SaveChanges();
    }
}
