using AquaBlend.Contracts.Milp;
using AquaBlend.Data;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using AquaBlend.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services;

/// <summary>
/// Resolves a ScenarioFormStateDto (the user's selections + overrides) into the canonical
/// MILP scenario document persisted into Scenario.FormStateJson
/// (Contracts/Milp/CanonicalMilpScenario.cs), by joining the user's selections against the
/// authoritative reference data (Plant, WaterSource, DemandZone, SourcePlantLink, PlantZoneLink,
/// QualityProfile/QualityParameter — see Data/SeedData.cs).
///
/// Two distinct failure modes, by design:
///   - An unselected/empty section (no sources, no plants chosen yet, no quality profile picked)
///     is a legitimate "incomplete draft" and produces an empty/absent section, not an error —
///     Services/ScenarioService.cs's ValidateAsync (unchanged) is still the "is this ready to
///     run" completeness gate, exactly as before this change.
///   - A *selected* entity that cannot be resolved (unknown ID, incomplete/broken reference row,
///     non-finite or inverted numeric value) is a genuine data-integrity problem and throws
///     ScenarioContractApiException — never silently substituted with 0, a placeholder, or a
///     guessed default.
/// </summary>
public class CanonicalScenarioBuilder
{
    private const string QualityAppliesTo = "blend_at_plant_inflow";

    private readonly AquaBlendDbContext _context;

    public CanonicalScenarioBuilder(AquaBlendDbContext context)
    {
        _context = context;
    }

    public async Task<CanonicalMilpScenario> BuildAsync(string scenarioId, string status, ScenarioFormStateDto form)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(scenarioId))
        {
            errors.Add("scenario_id is required.");
        }

        var scenarioName = form.ScenarioName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(scenarioName))
        {
            errors.Add("scenario_name is required.");
        }

        var sources = await ResolveSourcesAsync(form, errors);
        var plants = await ResolvePlantsAsync(form, errors);
        var demandZones = await ResolveDemandZonesAsync(form, errors);
        var (sourceToPlantLinks, plantToZoneLinks) = await ResolveNetworkAsync(form, errors);
        var qualityLimits = await ResolveQualityLimitsAsync(form, errors);

        if (errors.Count > 0)
        {
            throw new ScenarioContractApiException(errors);
        }

        return new CanonicalMilpScenario
        {
            ScenarioId = scenarioId,
            ScenarioName = scenarioName,
            Status = status,
            Description = form.Description ?? string.Empty,

            DataSource = new MilpDataSource
            {
                Type = "supabase",
                View = "public.source_model_inputs",
                AllowEstimatedValues = true,
            },

            Validation = new MilpValidationPolicy
            {
                FailIfSourceMissingFromDatabase = true,
                FailIfDailyAvailabilityMissing = true,
                FailIfRequiredQualityValueMissing = true,
                FailIfDemandMissing = true,
            },

            Sources = sources,
            Network = new MilpNetwork
            {
                Plants = plants,
                DemandZones = demandZones,
                SourceToPlantLinks = sourceToPlantLinks,
                PlantToZoneLinks = plantToZoneLinks,
            },
            QualityLimits = qualityLimits,
            QualityProfileId = string.IsNullOrWhiteSpace(form.QualityProfileId) ? null : form.QualityProfileId,
        };
    }

    private async Task<List<MilpScenarioSource>> ResolveSourcesAsync(ScenarioFormStateDto form, List<string> errors)
    {
        var result = new List<MilpScenarioSource>();
        if (form.Sources.Count == 0) return result;

        var requestedIds = form.Sources.Select(s => s.SourceId).ToHashSet();
        var knownIds = await _context.WaterSources.AsNoTracking()
            .Where(s => requestedIds.Contains(s.ExternalId))
            .Select(s => s.ExternalId)
            .ToListAsync();
        var knownIdSet = knownIds.ToHashSet();

        foreach (var s in form.Sources)
        {
            if (!knownIdSet.Contains(s.SourceId))
            {
                errors.Add($"Source '{s.SourceId}' was not found in reference data (public.source_model_inputs).");
                continue;
            }

            if (s.MinWithdrawalOverrideMlPerDay is double minOverride && !IsFinite(minOverride))
            {
                errors.Add($"Source '{s.SourceId}': minimum withdrawal override is not a finite number.");
            }

            if (s.MaxWithdrawalOverrideMlPerDay is double maxOverride && !IsFinite(maxOverride))
            {
                errors.Add($"Source '{s.SourceId}': maximum withdrawal override is not a finite number.");
            }

            if (s.MinWithdrawalOverrideMlPerDay is double lo && s.MaxWithdrawalOverrideMlPerDay is double hi && lo > hi)
            {
                errors.Add($"Source '{s.SourceId}': minimum withdrawal override exceeds maximum withdrawal override.");
            }

            result.Add(new MilpScenarioSource
            {
                SourceId = s.SourceId,
                Enabled = s.Enabled,
                ForcedInactive = s.ForcedInactive ?? false,
                MinimumWithdrawalMlPerDayOverride = s.MinWithdrawalOverrideMlPerDay,
                MaximumWithdrawalMlPerDayOverride = s.MaxWithdrawalOverrideMlPerDay,
                // No per-source fixed-activation-cost reference field exists (WaterSource entity);
                // the MILP contract's own documented example hardcodes this to 0.0 for every
                // source — a schema default, not fabricated reference data.
                FixedActivationCost = 0.0,
            });
        }

        return result;
    }

    private async Task<List<MilpPlant>> ResolvePlantsAsync(ScenarioFormStateDto form, List<string> errors)
    {
        var result = new List<MilpPlant>();
        if (form.Plants.Count == 0) return result;

        var requestedIds = form.Plants.Select(p => p.PlantId).ToHashSet();
        var refPlants = await _context.Plants.AsNoTracking()
            .Where(p => requestedIds.Contains(p.ExternalId))
            .ToDictionaryAsync(p => p.ExternalId);

        foreach (var p in form.Plants)
        {
            if (!refPlants.TryGetValue(p.PlantId, out var refPlant))
            {
                errors.Add($"Plant '{p.PlantId}' was not found in reference data.");
                continue;
            }

            if (refPlant.DefaultMinCapacityMlPerDay is null || refPlant.DefaultMaxCapacityMlPerDay is null)
            {
                errors.Add($"Plant '{p.PlantId}' reference data is missing a default minimum/maximum capacity.");
                continue;
            }

            if (refPlant.FixedActivationCost is null || refPlant.TreatmentCostPerMlPerDay is null)
            {
                errors.Add($"Plant '{p.PlantId}' reference data is missing a fixed activation cost or treatment cost.");
                continue;
            }

            var minimum = p.MinCapacityOverrideMlPerDay ?? refPlant.DefaultMinCapacityMlPerDay.Value;
            var maximum = p.MaxCapacityOverrideMlPerDay ?? refPlant.DefaultMaxCapacityMlPerDay.Value;

            if (!IsFinite(minimum) || !IsFinite(maximum))
            {
                errors.Add($"Plant '{p.PlantId}': resolved capacity is not a finite number.");
                continue;
            }

            if (minimum > maximum)
            {
                errors.Add($"Plant '{p.PlantId}': resolved minimum capacity ({minimum}) exceeds resolved maximum capacity ({maximum}).");
                continue;
            }

            result.Add(new MilpPlant
            {
                PlantId = p.PlantId,
                Name = refPlant.Name,
                Enabled = p.Enabled,
                MinimumProcessingCapacityMlPerDay = minimum,
                MaximumProcessingCapacityMlPerDay = maximum,
                FixedActivationCost = (double)refPlant.FixedActivationCost.Value,
                TreatmentCostPerMl = (double)refPlant.TreatmentCostPerMlPerDay.Value,
            });
        }

        return result;
    }

    private async Task<List<MilpDemandZone>> ResolveDemandZonesAsync(ScenarioFormStateDto form, List<string> errors)
    {
        var result = new List<MilpDemandZone>();
        if (form.DemandZones.Count == 0) return result;

        var requestedIds = form.DemandZones.Select(z => z.ZoneId).ToHashSet();
        var refZones = await _context.DemandZones.AsNoTracking()
            .Where(z => requestedIds.Contains(z.ExternalId))
            .ToDictionaryAsync(z => z.ExternalId);

        foreach (var z in form.DemandZones)
        {
            if (!refZones.TryGetValue(z.ZoneId, out var refZone))
            {
                errors.Add($"Demand zone '{z.ZoneId}' was not found in reference data.");
                continue;
            }

            if (z.DemandMlPerDay is double demand)
            {
                if (!IsFinite(demand))
                {
                    errors.Add($"Demand zone '{z.ZoneId}': demand is not a finite number.");
                    continue;
                }

                if (demand < 0)
                {
                    errors.Add($"Demand zone '{z.ZoneId}': demand cannot be negative.");
                    continue;
                }
            }

            result.Add(new MilpDemandZone
            {
                ZoneId = z.ZoneId,
                Name = refZone.Name,
                DemandMlPerDay = z.DemandMlPerDay,
            });
        }

        return result;
    }

    private async Task<(List<MilpSourceToPlantLink> SourceToPlant, List<MilpPlantToZoneLink> PlantToZone)> ResolveNetworkAsync(
        ScenarioFormStateDto form, List<string> errors)
    {
        var enabledSourceIds = form.Sources
            .Where(s => s.Enabled && !(s.ForcedInactive ?? false))
            .Select(s => s.SourceId)
            .ToHashSet();
        var enabledPlantIds = form.Plants.Where(p => p.Enabled).Select(p => p.PlantId).ToHashSet();
        var selectedZoneIds = form.DemandZones.Select(z => z.ZoneId).ToHashSet();

        if (enabledSourceIds.Count == 0 && enabledPlantIds.Count == 0 && selectedZoneIds.Count == 0)
        {
            return (new List<MilpSourceToPlantLink>(), new List<MilpPlantToZoneLink>());
        }

        var refSourcePlantLinks = await _context.SourcePlantLinks.AsNoTracking()
            .Include(l => l.Source)
            .Include(l => l.Plant)
            .Where(l => l.Enabled
                && enabledSourceIds.Contains(l.Source.ExternalId)
                && enabledPlantIds.Contains(l.Plant.ExternalId))
            .ToListAsync();

        var refPlantZoneLinks = await _context.PlantZoneLinks.AsNoTracking()
            .Include(l => l.Plant)
            .Include(l => l.Zone)
            .Where(l => l.Enabled
                && enabledPlantIds.Contains(l.Plant.ExternalId)
                && selectedZoneIds.Contains(l.Zone.ExternalId))
            .ToListAsync();

        var spOutages = new HashSet<string>();
        var pzOutages = new HashSet<string>();
        var spCapacityOverrides = new Dictionary<string, double>();
        var pzCapacityOverrides = new Dictionary<string, double>();

        var allSpLinkIds = (await _context.SourcePlantLinks.AsNoTracking().Select(l => l.ExternalId).ToListAsync()).ToHashSet();
        var allPzLinkIds = (await _context.PlantZoneLinks.AsNoTracking().Select(l => l.ExternalId).ToListAsync()).ToHashSet();

        foreach (var o in form.NetworkOverrides)
        {
            var isSpLink = allSpLinkIds.Contains(o.LinkId);
            var isPzLink = allPzLinkIds.Contains(o.LinkId);

            if (!isSpLink && !isPzLink)
            {
                errors.Add($"Network override references unknown link '{o.LinkId}'.");
                continue;
            }

            switch (o.Kind)
            {
                case "source_plant_outage":
                    if (!isSpLink)
                    {
                        errors.Add($"Network override '{o.LinkId}': kind 'source_plant_outage' does not match a source→plant link.");
                        break;
                    }
                    spOutages.Add(o.LinkId);
                    break;

                case "plant_zone_outage":
                    if (!isPzLink)
                    {
                        errors.Add($"Network override '{o.LinkId}': kind 'plant_zone_outage' does not match a plant→zone link.");
                        break;
                    }
                    pzOutages.Add(o.LinkId);
                    break;

                case "capacity_override":
                    if (o.CapacityOverrideMlPerDay is not double capacity || !IsFinite(capacity) || capacity < 0)
                    {
                        errors.Add($"Network override '{o.LinkId}': capacity override must be a finite number >= 0.");
                        break;
                    }
                    if (isSpLink) spCapacityOverrides[o.LinkId] = capacity;
                    else pzCapacityOverrides[o.LinkId] = capacity;
                    break;

                default:
                    errors.Add($"Network override '{o.LinkId}': unknown kind '{o.Kind}'.");
                    break;
            }
        }

        var sourceToPlant = new List<MilpSourceToPlantLink>();
        foreach (var link in refSourcePlantLinks)
        {
            if (spOutages.Contains(link.ExternalId)) continue;

            var capacity = spCapacityOverrides.TryGetValue(link.ExternalId, out var overrideCapacity)
                ? overrideCapacity
                : link.DefaultCapacityMlPerDay;

            if (capacity is null)
            {
                errors.Add($"Source→plant link '{link.ExternalId}' ({link.Source.ExternalId} -> {link.Plant.ExternalId}) has no configured capacity.");
                continue;
            }

            if (!IsFinite(capacity.Value) || capacity.Value < 0)
            {
                errors.Add($"Source→plant link '{link.ExternalId}': resolved capacity is not finite/non-negative.");
                continue;
            }

            sourceToPlant.Add(new MilpSourceToPlantLink
            {
                SourceId = link.Source.ExternalId,
                PlantId = link.Plant.ExternalId,
                Enabled = true,
                MaximumFlowMlPerDay = capacity.Value,
            });
        }

        var plantToZone = new List<MilpPlantToZoneLink>();
        foreach (var link in refPlantZoneLinks)
        {
            if (pzOutages.Contains(link.ExternalId)) continue;

            var capacity = pzCapacityOverrides.TryGetValue(link.ExternalId, out var overrideCapacity)
                ? overrideCapacity
                : link.DefaultCapacityMlPerDay;

            if (capacity is null)
            {
                errors.Add($"Plant→zone link '{link.ExternalId}' ({link.Plant.ExternalId} -> {link.Zone.ExternalId}) has no configured capacity.");
                continue;
            }

            if (!IsFinite(capacity.Value) || capacity.Value < 0)
            {
                errors.Add($"Plant→zone link '{link.ExternalId}': resolved capacity is not finite/non-negative.");
                continue;
            }

            plantToZone.Add(new MilpPlantToZoneLink
            {
                PlantId = link.Plant.ExternalId,
                ZoneId = link.Zone.ExternalId,
                Enabled = true,
                MaximumFlowMlPerDay = capacity.Value,
            });
        }

        return (sourceToPlant, plantToZone);
    }

    private async Task<MilpQualityLimits?> ResolveQualityLimitsAsync(ScenarioFormStateDto form, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(form.QualityProfileId))
        {
            return null;
        }

        var profile = await _context.QualityProfiles.AsNoTracking()
            .Include(q => q.Parameters)
            .FirstOrDefaultAsync(q => q.ExternalId == form.QualityProfileId);

        if (profile is null)
        {
            errors.Add($"Quality profile '{form.QualityProfileId}' was not found in reference data.");
            return null;
        }

        if (profile.Parameters.Count == 0)
        {
            errors.Add($"Quality profile '{form.QualityProfileId}' has no parameters configured.");
            return null;
        }

        var qualityErrors = new List<string>();
        var parameters = new Dictionary<string, MilpQualityParameter>();
        foreach (var param in profile.Parameters)
        {
            if (param.LowerLimit is null || param.UpperLimit is null || string.IsNullOrWhiteSpace(param.Unit))
            {
                qualityErrors.Add($"Quality profile '{form.QualityProfileId}', parameter '{param.ParameterId}': reference data is missing min/max/unit.");
                continue;
            }

            if (!IsFinite(param.LowerLimit.Value) || !IsFinite(param.UpperLimit.Value))
            {
                qualityErrors.Add($"Quality profile '{form.QualityProfileId}', parameter '{param.ParameterId}': min/max is not finite.");
                continue;
            }

            if (param.LowerLimit.Value > param.UpperLimit.Value)
            {
                qualityErrors.Add($"Quality profile '{form.QualityProfileId}', parameter '{param.ParameterId}': minimum exceeds maximum.");
                continue;
            }

            parameters[param.ParameterId] = new MilpQualityParameter
            {
                Unit = param.Unit,
                Min = param.LowerLimit.Value,
                Max = param.UpperLimit.Value,
                Transform = string.IsNullOrWhiteSpace(param.Transform) ? "identity" : param.Transform,
                SourceField = param.SourceField,
                ModelName = param.ModelName,
                ModelUnit = param.ModelUnit,
            };
        }

        if (qualityErrors.Count > 0)
        {
            errors.AddRange(qualityErrors);
            return null;
        }

        return new MilpQualityLimits
        {
            AppliesTo = QualityAppliesTo,
            Parameters = parameters,
        };
    }

    private static bool IsFinite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
}
