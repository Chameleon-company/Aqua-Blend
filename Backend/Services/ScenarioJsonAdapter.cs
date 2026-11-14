using System.Text.Json;
using AquaBlend.Contracts.Milp;
using AquaBlend.Data;
using AquaBlend.DTOs.Common;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using AquaBlend.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services;

/// <summary>
/// The single place that reads Scenario.FormStateJson back out. Handles both formats so
/// existing rows never need an eager migration (integration.md / AquaBlend_Claude_Canonical_
/// Scenario_JSON.md "legacy rows" requirement):
///   - canonical MILP documents (Contracts/Milp/CanonicalMilpScenario.cs) written by
///     Services/CanonicalScenarioBuilder.cs from now on — reverse-mapped back into the
///     camelCase ScenarioFormStateDto the rest of the backend (and the frontend, unchanged)
///     already knows how to render/edit;
///   - legacy camelCase ScenarioFormStateDto documents written before this change — deserialized
///     directly, exactly as Services/ScenarioService.cs always did.
/// Every consumer of a scenario's form state (ScenarioService, RunService) goes through this
/// instead of calling JsonSerializer.Deserialize&lt;ScenarioFormStateDto&gt; directly, so the two
/// formats never have to be handled ad hoc in more than one place.
/// </summary>
public class ScenarioJsonAdapter
{
    private readonly AquaBlendDbContext _context;

    public ScenarioJsonAdapter(AquaBlendDbContext context)
    {
        _context = context;
    }

    public async Task<ScenarioFormStateDto> ToFormStateAsync(Scenario scenario)
    {
        var json = string.IsNullOrWhiteSpace(scenario.FormStateJson) ? "{}" : scenario.FormStateJson;

        if (!LooksCanonical(json))
        {
            return JsonSerializer.Deserialize<ScenarioFormStateDto>(json, JsonDefaults.Options)
                ?? new ScenarioFormStateDto();
        }

        var canonical = JsonSerializer.Deserialize<CanonicalMilpScenario>(json, MilpJsonDefaults.Options)
            ?? throw new ScenarioContractApiException(new[]
            {
                $"Scenario '{scenario.ExternalId}': stored canonical JSON could not be parsed.",
            });

        // Scenarios.ExternalId is authoritative (AquaBlend_Claude_Canonical_Scenario_JSON.md
        // Phase 4) — never guess which value is correct when they disagree.
        if (!string.Equals(canonical.ScenarioId, scenario.ExternalId, StringComparison.Ordinal))
        {
            throw new ScenarioContractApiException(new[]
            {
                $"Scenario '{scenario.ExternalId}': stored scenario_id '{canonical.ScenarioId}' does not match Scenarios.ExternalId.",
            });
        }

        return await ReverseMapAsync(canonical);
    }

    /// <summary>
    /// Batched form of <see cref="ToFormStateAsync"/> for list endpoints
    /// (Services/ScenarioService.cs GetAllAsync): reference data (Plants, SourcePlantLinks,
    /// PlantZoneLinks) is fetched once for the union of all scenarios' ids instead of once per
    /// scenario, then filtered back down per scenario in memory. Keyed by Scenario.Id.
    /// </summary>
    public async Task<Dictionary<int, ScenarioFormStateDto>> ToFormStateBatchAsync(IReadOnlyList<Scenario> scenarios)
    {
        var result = new Dictionary<int, ScenarioFormStateDto>();
        var canonicalByScenarioId = new Dictionary<int, CanonicalMilpScenario>();

        foreach (var scenario in scenarios)
        {
            var json = string.IsNullOrWhiteSpace(scenario.FormStateJson) ? "{}" : scenario.FormStateJson;

            if (!LooksCanonical(json))
            {
                result[scenario.Id] = JsonSerializer.Deserialize<ScenarioFormStateDto>(json, JsonDefaults.Options)
                    ?? new ScenarioFormStateDto();
                continue;
            }

            var canonical = JsonSerializer.Deserialize<CanonicalMilpScenario>(json, MilpJsonDefaults.Options)
                ?? throw new ScenarioContractApiException(new[]
                {
                    $"Scenario '{scenario.ExternalId}': stored canonical JSON could not be parsed.",
                });

            if (!string.Equals(canonical.ScenarioId, scenario.ExternalId, StringComparison.Ordinal))
            {
                throw new ScenarioContractApiException(new[]
                {
                    $"Scenario '{scenario.ExternalId}': stored scenario_id '{canonical.ScenarioId}' does not match Scenarios.ExternalId.",
                });
            }

            canonicalByScenarioId[scenario.Id] = canonical;
        }

        if (canonicalByScenarioId.Count == 0)
        {
            return result;
        }

        var allPlantIds = canonicalByScenarioId.Values
            .SelectMany(c => c.Network.Plants.Select(p => p.PlantId))
            .ToHashSet();
        var allEnabledSourceIds = canonicalByScenarioId.Values
            .SelectMany(c => c.Sources.Where(s => s.Enabled).Select(s => s.SourceId))
            .ToHashSet();
        var allEnabledPlantIds = canonicalByScenarioId.Values
            .SelectMany(c => c.Network.Plants.Where(p => p.Enabled).Select(p => p.PlantId))
            .ToHashSet();
        var allZoneIds = canonicalByScenarioId.Values
            .SelectMany(c => c.Network.DemandZones.Select(z => z.ZoneId))
            .ToHashSet();

        var refPlants = await _context.Plants.AsNoTracking()
            .Where(p => allPlantIds.Contains(p.ExternalId))
            .ToDictionaryAsync(p => p.ExternalId);

        var refSourcePlantLinks = await _context.SourcePlantLinks.AsNoTracking()
            .Include(l => l.Source).Include(l => l.Plant)
            .Where(l => l.Enabled
                && allEnabledSourceIds.Contains(l.Source.ExternalId)
                && allEnabledPlantIds.Contains(l.Plant.ExternalId))
            .ToListAsync();

        var refPlantZoneLinks = await _context.PlantZoneLinks.AsNoTracking()
            .Include(l => l.Plant).Include(l => l.Zone)
            .Where(l => l.Enabled
                && allEnabledPlantIds.Contains(l.Plant.ExternalId)
                && allZoneIds.Contains(l.Zone.ExternalId))
            .ToListAsync();

        foreach (var (scenarioId, canonical) in canonicalByScenarioId)
        {
            var enabledSourceIds = canonical.Sources.Where(s => s.Enabled).Select(s => s.SourceId).ToHashSet();
            var enabledPlantIds = canonical.Network.Plants.Where(p => p.Enabled).Select(p => p.PlantId).ToHashSet();
            var zoneIds = canonical.Network.DemandZones.Select(z => z.ZoneId).ToHashSet();

            var scenarioSourcePlantLinks = refSourcePlantLinks
                .Where(l => enabledSourceIds.Contains(l.Source.ExternalId) && enabledPlantIds.Contains(l.Plant.ExternalId))
                .ToList();
            var scenarioPlantZoneLinks = refPlantZoneLinks
                .Where(l => enabledPlantIds.Contains(l.Plant.ExternalId) && zoneIds.Contains(l.Zone.ExternalId))
                .ToList();

            result[scenarioId] = BuildFormState(canonical, refPlants, scenarioSourcePlantLinks, scenarioPlantZoneLinks);
        }

        return result;
    }

    /// <summary>
    /// If the scenario's stored JSON is canonical, returns a copy with `status` set to the
    /// row's current (authoritative) Status and re-serialized — otherwise null (legacy rows
    /// carry no embedded status field to keep in sync; Scenarios.Status alone is authoritative
    /// for them, exactly as before this change). Called after ValidateAsync changes
    /// scenario.Status, so FormStateJson.status never goes stale relative to the row.
    /// </summary>
    public string? TrySyncStatus(Scenario scenario)
    {
        var json = string.IsNullOrWhiteSpace(scenario.FormStateJson) ? "{}" : scenario.FormStateJson;
        if (!LooksCanonical(json)) return null;

        var canonical = JsonSerializer.Deserialize<CanonicalMilpScenario>(json, MilpJsonDefaults.Options);
        if (canonical is null) return null;

        canonical.Status = scenario.Status;
        return JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);
    }

    /// <summary>Shared with Services/MilpInputSnapshotService.cs so both places agree on exactly
    /// one definition of "this Scenario.FormStateJson document is canonical".</summary>
    internal static bool LooksCanonical(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return root.ValueKind == JsonValueKind.Object
                && root.TryGetProperty("scenario_id", out _)
                && root.TryGetProperty("network", out _);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private async Task<ScenarioFormStateDto> ReverseMapAsync(CanonicalMilpScenario canonical)
    {
        var plantIds = canonical.Network.Plants.Select(p => p.PlantId).ToHashSet();
        var refPlants = await _context.Plants.AsNoTracking()
            .Where(p => plantIds.Contains(p.ExternalId))
            .ToDictionaryAsync(p => p.ExternalId);

        var enabledSourceIds = canonical.Sources.Where(s => s.Enabled).Select(s => s.SourceId).ToHashSet();
        var enabledPlantIds = canonical.Network.Plants.Where(p => p.Enabled).Select(p => p.PlantId).ToHashSet();
        var zoneIds = canonical.Network.DemandZones.Select(z => z.ZoneId).ToHashSet();

        var refSourcePlantLinks = await _context.SourcePlantLinks.AsNoTracking()
            .Include(l => l.Source).Include(l => l.Plant)
            .Where(l => l.Enabled
                && enabledSourceIds.Contains(l.Source.ExternalId)
                && enabledPlantIds.Contains(l.Plant.ExternalId))
            .ToListAsync();

        var refPlantZoneLinks = await _context.PlantZoneLinks.AsNoTracking()
            .Include(l => l.Plant).Include(l => l.Zone)
            .Where(l => l.Enabled
                && enabledPlantIds.Contains(l.Plant.ExternalId)
                && zoneIds.Contains(l.Zone.ExternalId))
            .ToListAsync();

        return BuildFormState(canonical, refPlants, refSourcePlantLinks, refPlantZoneLinks);
    }

    private static ScenarioFormStateDto BuildFormState(
        CanonicalMilpScenario canonical,
        Dictionary<string, Plant> refPlants,
        List<SourcePlantLink> refSourcePlantLinks,
        List<PlantZoneLink> refPlantZoneLinks)
    {
        return new ScenarioFormStateDto
        {
            ScenarioName = canonical.ScenarioName,
            Description = canonical.Description,
            QualityProfileId = canonical.QualityProfileId,
            Sources = canonical.Sources.Select(s => new ScenarioSourceSelectionDto
            {
                SourceId = s.SourceId,
                Enabled = s.Enabled,
                ForcedInactive = s.ForcedInactive,
                MinWithdrawalOverrideMlPerDay = s.MinimumWithdrawalMlPerDayOverride,
                MaxWithdrawalOverrideMlPerDay = s.MaximumWithdrawalMlPerDayOverride,
            }).ToList(),
            Plants = canonical.Network.Plants.Select(p => ReversePlant(p, refPlants)).ToList(),
            DemandZones = canonical.Network.DemandZones.Select(z => new ScenarioDemandSelectionDto
            {
                ZoneId = z.ZoneId,
                DemandMlPerDay = z.DemandMlPerDay,
            }).ToList(),
            NetworkOverrides = InferNetworkOverrides(canonical, refSourcePlantLinks, refPlantZoneLinks),
        };
    }

    /// <summary>
    /// The canonical plant record stores only the final resolved capacity, never "was this
    /// overridden" (AquaBlend_Claude_Canonical_Scenario_JSON.md Phase 6). To redisplay the
    /// override inputs on the edit form, infer: a resolved value that differs from the current
    /// reference default is treated as an explicit override; one that matches is treated as "no
    /// override". This is a best-effort inference, not a stored fact — a user who deliberately
    /// overrides to a value identical to the (current) reference default will see it as
    /// "no override" on reload. Documented, not hidden: see the implementation report.
    /// </summary>
    private static ScenarioPlantSelectionDto ReversePlant(MilpPlant plant, Dictionary<string, Plant> refPlants)
    {
        double? minOverride = null;
        double? maxOverride = null;

        if (refPlants.TryGetValue(plant.PlantId, out var refPlant))
        {
            if (refPlant.DefaultMinCapacityMlPerDay is not double refMin || !NearlyEqual(refMin, plant.MinimumProcessingCapacityMlPerDay))
            {
                minOverride = plant.MinimumProcessingCapacityMlPerDay;
            }

            if (refPlant.DefaultMaxCapacityMlPerDay is not double refMax || !NearlyEqual(refMax, plant.MaximumProcessingCapacityMlPerDay))
            {
                maxOverride = plant.MaximumProcessingCapacityMlPerDay;
            }
        }
        else
        {
            // Plant no longer in reference data at all — cannot tell "default" from "override",
            // so surface the resolved value as an explicit override rather than silently
            // dropping it.
            minOverride = plant.MinimumProcessingCapacityMlPerDay;
            maxOverride = plant.MaximumProcessingCapacityMlPerDay;
        }

        return new ScenarioPlantSelectionDto
        {
            PlantId = plant.PlantId,
            Enabled = plant.Enabled,
            MinCapacityOverrideMlPerDay = minOverride,
            MaxCapacityOverrideMlPerDay = maxOverride,
        };
    }

    /// <summary>
    /// Symmetric inference for network overrides: a reference link that would otherwise be
    /// relevant to this scenario but is absent from the canonical network is inferred as an
    /// outage; one present with a capacity that differs from the reference default is inferred
    /// as a capacity override. Same best-effort caveat as ReversePlant.
    /// </summary>
    private static List<NetworkOverrideDto> InferNetworkOverrides(
        CanonicalMilpScenario canonical,
        List<SourcePlantLink> refSourcePlantLinks,
        List<PlantZoneLink> refPlantZoneLinks)
    {
        var overrides = new List<NetworkOverrideDto>();

        foreach (var refLink in refSourcePlantLinks)
        {
            var match = canonical.Network.SourceToPlantLinks
                .FirstOrDefault(l => l.SourceId == refLink.Source.ExternalId && l.PlantId == refLink.Plant.ExternalId);

            if (match is null)
            {
                overrides.Add(new NetworkOverrideDto { LinkId = refLink.ExternalId, Kind = "source_plant_outage" });
            }
            else if (refLink.DefaultCapacityMlPerDay is not double refCap || !NearlyEqual(refCap, match.MaximumFlowMlPerDay))
            {
                overrides.Add(new NetworkOverrideDto
                {
                    LinkId = refLink.ExternalId,
                    Kind = "capacity_override",
                    CapacityOverrideMlPerDay = match.MaximumFlowMlPerDay,
                });
            }
        }

        foreach (var refLink in refPlantZoneLinks)
        {
            var match = canonical.Network.PlantToZoneLinks
                .FirstOrDefault(l => l.PlantId == refLink.Plant.ExternalId && l.ZoneId == refLink.Zone.ExternalId);

            if (match is null)
            {
                overrides.Add(new NetworkOverrideDto { LinkId = refLink.ExternalId, Kind = "plant_zone_outage" });
            }
            else if (refLink.DefaultCapacityMlPerDay is not double refCap || !NearlyEqual(refCap, match.MaximumFlowMlPerDay))
            {
                overrides.Add(new NetworkOverrideDto
                {
                    LinkId = refLink.ExternalId,
                    Kind = "capacity_override",
                    CapacityOverrideMlPerDay = match.MaximumFlowMlPerDay,
                });
            }
        }

        return overrides;
    }

    private static bool NearlyEqual(double a, double b) => Math.Abs(a - b) < 1e-9;
}
