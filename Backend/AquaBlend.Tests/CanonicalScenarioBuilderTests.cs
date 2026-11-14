using System.Text.Json;
using AquaBlend.Contracts.Milp;
using AquaBlend.Data;
using AquaBlend.DTOs.Common;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using AquaBlend.Exceptions;
using AquaBlend.Services;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Tests;

/// <summary>
/// Covers AquaBlend_Claude_Canonical_Scenario_JSON.md's Phase 15 test list: the UI-form →
/// canonical-MILP-JSON transform (CanonicalScenarioBuilder), and its reverse
/// (ScenarioJsonAdapter), against a small self-contained reference dataset (not the full
/// Data/SeedData.cs fixture) so each test controls exactly the reference rows it needs.
/// </summary>
public class CanonicalScenarioBuilderTests
{
    private static AquaBlendDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<AquaBlendDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AquaBlendDbContext(options);
    }

    /// <summary>Seeds a minimal, deliberately real (non-placeholder) reference dataset:
    /// two sources, two plants, two zones, source→plant and plant→zone links, and a
    /// complete quality profile — mirroring the shape (not the exact values) of
    /// Data/SeedData.cs so tests aren't coupled to production seed data changing.</summary>
    private static async Task<AquaBlendDbContext> SeededContextAsync()
    {
        var context = NewContext();

        var src1 = new WaterSource { ExternalId = "SRC_001", Name = "Silvan Reservoir", SourceType = "reservoir", ModelReady = true, DefaultMinWithdrawalMlPerDay = 0, DefaultMaxWithdrawalMlPerDay = 250 };
        var src2 = new WaterSource { ExternalId = "SRC_002", Name = "Yarra River", SourceType = "river", ModelReady = true, DefaultMinWithdrawalMlPerDay = 0, DefaultMaxWithdrawalMlPerDay = 320 };
        context.WaterSources.AddRange(src1, src2);

        var plant1 = new Plant { ExternalId = "PLANT_001", Name = "Treatment Plant 1", DefaultMinCapacityMlPerDay = 10, DefaultMaxCapacityMlPerDay = 400, FixedActivationCost = 5000, TreatmentCostPerMlPerDay = 80 };
        var plant2 = new Plant { ExternalId = "PLANT_002", Name = "Treatment Plant 2", DefaultMinCapacityMlPerDay = 10, DefaultMaxCapacityMlPerDay = 250, FixedActivationCost = 3500, TreatmentCostPerMlPerDay = 95 };
        context.Plants.AddRange(plant1, plant2);

        var zone1 = new DemandZone { ExternalId = "ZONE_001", Name = "North Zone" };
        var zone2 = new DemandZone { ExternalId = "ZONE_002", Name = "South Zone" };
        context.DemandZones.AddRange(zone1, zone2);

        await context.SaveChangesAsync();

        context.SourcePlantLinks.AddRange(
            new SourcePlantLink { ExternalId = "LINK-SP-001", SourceId = src1.Id, PlantId = plant1.Id, Enabled = true, DefaultCapacityMlPerDay = 250 },
            new SourcePlantLink { ExternalId = "LINK-SP-002", SourceId = src2.Id, PlantId = plant1.Id, Enabled = true, DefaultCapacityMlPerDay = 200 },
            new SourcePlantLink { ExternalId = "LINK-SP-003", SourceId = src2.Id, PlantId = plant2.Id, Enabled = true, DefaultCapacityMlPerDay = 150 });

        context.PlantZoneLinks.AddRange(
            new PlantZoneLink { ExternalId = "LINK-PZ-001", PlantId = plant1.Id, ZoneId = zone1.Id, Enabled = true, DefaultCapacityMlPerDay = 300 },
            new PlantZoneLink { ExternalId = "LINK-PZ-002", PlantId = plant1.Id, ZoneId = zone2.Id, Enabled = true, DefaultCapacityMlPerDay = 150 },
            new PlantZoneLink { ExternalId = "LINK-PZ-003", PlantId = plant2.Id, ZoneId = zone2.Id, Enabled = true, DefaultCapacityMlPerDay = 200 });

        context.QualityProfiles.Add(new QualityProfile
        {
            ExternalId = "STANDARD_001",
            Name = "Standard Water Quality",
            Parameters = new List<QualityParameter>
            {
                new() { ParameterId = "pH", Label = "pH", Unit = "pH", LowerLimit = 6.5, UpperLimit = 8.5, Transform = "ph_to_hydrogen_ion", SourceField = "representative_ph", ModelName = "hydrogen_ion_concentration_mol_l", ModelUnit = "nmol/L" },
                new() { ParameterId = "alkalinity", Label = "Alkalinity", Unit = "mg/L CaCO3", LowerLimit = 20.0, UpperLimit = 200.0, Transform = "identity", SourceField = "representative_alkalinity_mg_l_caco3" },
                new() { ParameterId = "turbidity", Label = "Turbidity", Unit = "NTU", LowerLimit = 0.5, UpperLimit = 5.0, Transform = "identity", SourceField = "representative_turbidity_ntu" },
            },
        });

        await context.SaveChangesAsync();
        return context;
    }

    private static ScenarioFormStateDto FullForm() => new()
    {
        ScenarioName = "Drought Scenario",
        Description = "Low rainfall projection",
        Sources = new List<ScenarioSourceSelectionDto>
        {
            new() { SourceId = "SRC_001", Enabled = true },
            new() { SourceId = "SRC_002", Enabled = true },
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

    // 1. UI form -> canonical JSON, happy path.
    [Fact]
    public async Task BuildAsync_FullForm_ProducesCompleteCanonicalDocument()
    {
        using var context = await SeededContextAsync();
        var builder = new CanonicalScenarioBuilder(context);

        var canonical = await builder.BuildAsync("scenario_2026_07_17_001", "ready", FullForm());

        Assert.Equal("scenario_2026_07_17_001", canonical.ScenarioId);
        Assert.Equal("Drought Scenario", canonical.ScenarioName);
        Assert.Equal("ready", canonical.Status);
        Assert.Equal(2, canonical.Sources.Count);
        Assert.Equal(2, canonical.Network.Plants.Count);
        Assert.Equal(2, canonical.Network.DemandZones.Count);
        Assert.Equal(3, canonical.Network.SourceToPlantLinks.Count);
        Assert.Equal(3, canonical.Network.PlantToZoneLinks.Count);
        Assert.NotNull(canonical.QualityLimits);
        Assert.Equal(3, canonical.QualityLimits!.Parameters.Count);
    }

    // 2-6. Field-name mapping: assert the serialized JSON uses the exact snake_case MILP keys.
    [Fact]
    public async Task Serialize_UsesExactMilpFieldNames()
    {
        using var context = await SeededContextAsync();
        var builder = new CanonicalScenarioBuilder(context);
        var canonical = await builder.BuildAsync("scenario_2026_07_17_001", "ready", FullForm());

        var json = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("scenario_id", out _));
        Assert.True(root.TryGetProperty("scenario_name", out _));
        Assert.True(root.TryGetProperty("status", out _));
        Assert.True(root.TryGetProperty("data_source", out _));
        Assert.True(root.TryGetProperty("validation", out _));
        Assert.True(root.TryGetProperty("sources", out var sources));
        Assert.True(root.TryGetProperty("network", out var network));
        Assert.True(root.TryGetProperty("quality_limits", out var quality));

        var firstSource = sources[0];
        Assert.True(firstSource.TryGetProperty("source_id", out _));
        Assert.True(firstSource.TryGetProperty("forced_inactive", out _));
        Assert.True(firstSource.TryGetProperty("minimum_withdrawal_ml_per_day_override", out _));
        Assert.True(firstSource.TryGetProperty("maximum_withdrawal_ml_per_day_override", out _));
        Assert.True(firstSource.TryGetProperty("fixed_activation_cost", out _));

        Assert.True(network.TryGetProperty("plants", out var plants));
        Assert.True(network.TryGetProperty("demand_zones", out var zones));
        Assert.True(network.TryGetProperty("source_to_plant_links", out _));
        Assert.True(network.TryGetProperty("plant_to_zone_links", out _));

        var firstPlant = plants[0];
        Assert.True(firstPlant.TryGetProperty("plant_id", out _));
        Assert.True(firstPlant.TryGetProperty("minimum_processing_capacity_ml_per_day", out _));
        Assert.True(firstPlant.TryGetProperty("maximum_processing_capacity_ml_per_day", out _));
        Assert.True(firstPlant.TryGetProperty("fixed_activation_cost", out _));
        Assert.True(firstPlant.TryGetProperty("treatment_cost_per_ml", out _));

        var firstZone = zones[0];
        Assert.True(firstZone.TryGetProperty("zone_id", out _));
        Assert.True(firstZone.TryGetProperty("demand_ml_per_day", out _));

        Assert.True(quality.TryGetProperty("applies_to", out _));
        Assert.True(quality.TryGetProperty("parameters", out var parameters));
        Assert.True(parameters.TryGetProperty("pH", out var ph)); // dictionary key, not snake_cased
        Assert.True(ph.TryGetProperty("model_name", out _));
        Assert.True(ph.TryGetProperty("model_unit", out _));
    }

    // 7. Null source withdrawal overrides pass through as null.
    [Fact]
    public async Task BuildAsync_NullSourceOverrides_PersistAsNull()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Sources[0].MinWithdrawalOverrideMlPerDay = null;
        form.Sources[0].MaxWithdrawalOverrideMlPerDay = null;

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        var src = canonical.Sources.Single(s => s.SourceId == "SRC_001");
        Assert.Null(src.MinimumWithdrawalMlPerDayOverride);
        Assert.Null(src.MaximumWithdrawalMlPerDayOverride);
    }

    // 8. Non-null source withdrawal overrides pass through verbatim (not resolved away).
    [Fact]
    public async Task BuildAsync_NonNullSourceOverrides_PersistVerbatim()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Sources[0].MinWithdrawalOverrideMlPerDay = 5;
        form.Sources[0].MaxWithdrawalOverrideMlPerDay = 150;

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        var src = canonical.Sources.Single(s => s.SourceId == "SRC_001");
        Assert.Equal(5, src.MinimumWithdrawalMlPerDayOverride);
        Assert.Equal(150, src.MaximumWithdrawalMlPerDayOverride);
    }

    // 9. Null plant capacity overrides resolve to the reference default.
    [Fact]
    public async Task BuildAsync_NullPlantOverrides_ResolveToReferenceDefaults()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Plants[0].MinCapacityOverrideMlPerDay = null;
        form.Plants[0].MaxCapacityOverrideMlPerDay = null;

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        var plant = canonical.Network.Plants.Single(p => p.PlantId == "PLANT_001");
        Assert.Equal(10, plant.MinimumProcessingCapacityMlPerDay);
        Assert.Equal(400, plant.MaximumProcessingCapacityMlPerDay);
    }

    // 10. Non-null plant capacity overrides win over the reference default.
    [Fact]
    public async Task BuildAsync_NonNullPlantOverrides_WinOverReferenceDefaults()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Plants[0].MinCapacityOverrideMlPerDay = 50;
        form.Plants[0].MaxCapacityOverrideMlPerDay = 300;

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        var plant = canonical.Network.Plants.Single(p => p.PlantId == "PLANT_001");
        Assert.Equal(50, plant.MinimumProcessingCapacityMlPerDay);
        Assert.Equal(300, plant.MaximumProcessingCapacityMlPerDay);
        // Resolved value only — no "override" field anywhere in the canonical plant object.
        Assert.DoesNotContain("override", JsonSerializer.Serialize(plant, MilpJsonDefaults.Options), StringComparison.OrdinalIgnoreCase);
    }

    // 11. A disabled source stays in sources[] (enabled: false) and is excluded from network links.
    [Fact]
    public async Task BuildAsync_DisabledSource_RemainsListedButExcludedFromLinks()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Sources[1].Enabled = false; // SRC_002

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        Assert.Contains(canonical.Sources, s => s.SourceId == "SRC_002" && s.Enabled == false);
        Assert.DoesNotContain(canonical.Network.SourceToPlantLinks, l => l.SourceId == "SRC_002");
    }

    // 12. A disabled plant stays in network.plants (enabled: false) and is excluded from links.
    [Fact]
    public async Task BuildAsync_DisabledPlant_RemainsListedButExcludedFromLinks()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Plants[1].Enabled = false;

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        Assert.Contains(canonical.Network.Plants, p => p.PlantId == "PLANT_002" && p.Enabled == false);
        Assert.DoesNotContain(canonical.Network.SourceToPlantLinks, l => l.PlantId == "PLANT_002");
        Assert.DoesNotContain(canonical.Network.PlantToZoneLinks, l => l.PlantId == "PLANT_002");
    }

    // 13. ExternalId / scenario_id mismatch fails explicitly (via the reverse adapter — the
    // only place a mismatch can occur, since BuildAsync always derives scenario_id from the
    // row's own ExternalId and never trusts client input for it).
    [Fact]
    public async Task ToFormStateAsync_ScenarioIdMismatch_ThrowsExplicitly()
    {
        using var context = await SeededContextAsync();
        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("scenario_2026_07_17_001", "ready", FullForm());
        var json = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);

        var scenario = new Scenario { ExternalId = "SCN-999", FormStateJson = json, ValidationIssuesJson = "[]" };
        var adapter = new ScenarioJsonAdapter(context);

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(() => adapter.ToFormStateAsync(scenario));
        Assert.Contains("scenario_id", ex.Message);
    }

    // 14. Missing plant reference data fails explicitly, not silently defaulted.
    [Fact]
    public async Task BuildAsync_UnknownPlantId_Throws()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Plants.Add(new ScenarioPlantSelectionDto { PlantId = "PLANT_DOES_NOT_EXIST", Enabled = true });

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form));

        Assert.Contains(ex.Errors, e => e.Contains("PLANT_DOES_NOT_EXIST"));
    }

    // 15. Invalid (inverted) plant min/max after override application fails explicitly.
    [Fact]
    public async Task BuildAsync_PlantMinExceedsMax_Throws()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Plants[0].MinCapacityOverrideMlPerDay = 500; // > PLANT_001's reference max of 400

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form));

        Assert.Contains(ex.Errors, e => e.Contains("PLANT_001") && e.Contains("exceeds"));
    }

    // 16. A network override referencing an unknown link ID fails explicitly.
    [Fact]
    public async Task BuildAsync_NetworkOverrideUnknownLink_Throws()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.NetworkOverrides.Add(new NetworkOverrideDto { LinkId = "LINK-DOES-NOT-EXIST", Kind = "source_plant_outage" });

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form));

        Assert.Contains(ex.Errors, e => e.Contains("LINK-DOES-NOT-EXIST"));
    }

    // 17. A link with no configured reference capacity (and no override) fails explicitly
    // rather than being silently dropped or defaulted to 0.
    [Fact]
    public async Task BuildAsync_LinkMissingCapacity_Throws()
    {
        using var context = await SeededContextAsync();
        var brokenLink = await context.SourcePlantLinks.FirstAsync(l => l.ExternalId == "LINK-SP-001");
        brokenLink.DefaultCapacityMlPerDay = null;
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", FullForm()));

        Assert.Contains(ex.Errors, e => e.Contains("LINK-SP-001") && e.Contains("capacity"));
    }

    // 18. Network overrides are applied: an outage removes the link, a capacity override
    // replaces the resolved maximum_flow_ml_per_day.
    [Fact]
    public async Task BuildAsync_NetworkOverrides_OutageAndCapacityOverrideApplied()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.NetworkOverrides.Add(new NetworkOverrideDto { LinkId = "LINK-SP-002", Kind = "source_plant_outage" });
        form.NetworkOverrides.Add(new NetworkOverrideDto { LinkId = "LINK-PZ-003", Kind = "capacity_override", CapacityOverrideMlPerDay = 42 });

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        Assert.DoesNotContain(canonical.Network.SourceToPlantLinks, l => l.SourceId == "SRC_002" && l.PlantId == "PLANT_001");
        var overriddenLink = canonical.Network.PlantToZoneLinks.Single(l => l.PlantId == "PLANT_002" && l.ZoneId == "ZONE_002");
        Assert.Equal(42, overriddenLink.MaximumFlowMlPerDay);
    }

    // 19. Quality profile expansion: STANDARD_001 -> full quality_limits with the merged
    // MILP contract's transform/source_field/model_name/model_unit metadata.
    [Fact]
    public async Task BuildAsync_QualityProfile_ExpandsToCompleteLimits()
    {
        using var context = await SeededContextAsync();
        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", FullForm());

        Assert.Equal("blend_at_plant_inflow", canonical.QualityLimits!.AppliesTo);

        var ph = canonical.QualityLimits.Parameters["pH"];
        Assert.Equal(6.5, ph.Min);
        Assert.Equal(8.5, ph.Max);
        Assert.Equal("ph_to_hydrogen_ion", ph.Transform);
        Assert.Equal("representative_ph", ph.SourceField);
        Assert.Equal("hydrogen_ion_concentration_mol_l", ph.ModelName);
        Assert.Equal("nmol/L", ph.ModelUnit); // merged quality-scaling contract, not mol/L

        var alkalinity = canonical.QualityLimits.Parameters["alkalinity"];
        Assert.Equal(20.0, alkalinity.Min);
        Assert.Equal(200.0, alkalinity.Max);
        Assert.Equal("identity", alkalinity.Transform);
        Assert.Null(alkalinity.ModelName);

        var turbidity = canonical.QualityLimits.Parameters["turbidity"];
        Assert.Equal(0.5, turbidity.Min);
        Assert.Equal(5.0, turbidity.Max);
    }

    // 19b. A quality parameter with an incomplete reference row (missing lower bound) fails
    // explicitly instead of defaulting to 0/omitting the bound.
    [Fact]
    public async Task BuildAsync_QualityParameterMissingLowerBound_Throws()
    {
        using var context = await SeededContextAsync();
        var alkalinity = await context.QualityParameters.FirstAsync(p => p.ParameterId == "alkalinity");
        alkalinity.LowerLimit = null;
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", FullForm()));

        Assert.Contains(ex.Errors, e => e.Contains("alkalinity") && e.Contains("min/max"));
    }

    // 20. Missing quality profile fails explicitly.
    [Fact]
    public async Task BuildAsync_UnknownQualityProfile_Throws()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.QualityProfileId = "DOES_NOT_EXIST";

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form));

        Assert.Contains(ex.Errors, e => e.Contains("DOES_NOT_EXIST"));
    }

    // An empty/incomplete draft (no selections at all) is NOT an error — it produces empty
    // sections, preserving the existing "save an incomplete draft" UX
    // (Backend/AquaBlend.Tests/ScenarioEndpointsTests.cs's Validate_EmptyScenario_ReturnsIssues).
    [Fact]
    public async Task BuildAsync_EmptyDraft_DoesNotThrow()
    {
        using var context = await SeededContextAsync();
        var form = new ScenarioFormStateDto { ScenarioName = "Incomplete Scenario" };

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form);

        Assert.Empty(canonical.Sources);
        Assert.Empty(canonical.Network.Plants);
        Assert.Empty(canonical.Network.DemandZones);
        Assert.Null(canonical.QualityLimits);
    }

    // 21. Legacy camelCase JSON is read back correctly (no eager migration required).
    [Fact]
    public async Task ToFormStateAsync_LegacyJson_DeserializesDirectly()
    {
        using var context = await SeededContextAsync();
        var legacyForm = FullForm();
        var legacyJson = JsonSerializer.Serialize(legacyForm, JsonDefaults.Options);
        var scenario = new Scenario { ExternalId = "SCN-LEGACY", FormStateJson = legacyJson, ValidationIssuesJson = "[]" };

        var form = await new ScenarioJsonAdapter(context).ToFormStateAsync(scenario);

        Assert.Equal("Drought Scenario", form.ScenarioName);
        Assert.Equal(2, form.Sources.Count);
        Assert.Equal("SRC_001", form.Sources[0].SourceId);
    }

    // 22. Canonical JSON -> edit-form state round trip, including inferred plant/network
    // overrides (the canonical document stores only resolved values, never the override
    // itself — ScenarioJsonAdapter infers "was this overridden?" by comparing the resolved
    // value against the current reference default).
    [Fact]
    public async Task ToFormStateAsync_CanonicalJson_RoundTripsWithInferredOverrides()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Plants[0].MinCapacityOverrideMlPerDay = 50; // explicit override
        form.NetworkOverrides.Add(new NetworkOverrideDto { LinkId = "LINK-SP-002", Kind = "source_plant_outage" });

        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("scenario_2026_07_17_001", "ready", form);
        var json = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);
        var scenario = new Scenario { ExternalId = "scenario_2026_07_17_001", FormStateJson = json, ValidationIssuesJson = "[]" };

        var reversed = await new ScenarioJsonAdapter(context).ToFormStateAsync(scenario);

        Assert.Equal("Drought Scenario", reversed.ScenarioName);
        Assert.Equal("STANDARD_001", reversed.QualityProfileId);

        var reversedPlant1 = reversed.Plants.Single(p => p.PlantId == "PLANT_001");
        Assert.Equal(50, reversedPlant1.MinCapacityOverrideMlPerDay); // inferred override recovered
        var reversedPlant2 = reversed.Plants.Single(p => p.PlantId == "PLANT_002");
        Assert.Null(reversedPlant2.MinCapacityOverrideMlPerDay); // no override -> null, not the default value

        Assert.Contains(reversed.NetworkOverrides, o => o.LinkId == "LINK-SP-002" && o.Kind == "source_plant_outage");
    }

    // 23. Serialized JSON never contains NaN/Infinity literals — the builder rejects
    // non-finite values before they ever reach the serializer.
    [Fact]
    public async Task BuildAsync_NonFiniteSourceOverride_ThrowsBeforeSerialization()
    {
        using var context = await SeededContextAsync();
        var form = FullForm();
        form.Sources[0].MaxWithdrawalOverrideMlPerDay = double.NaN;

        var ex = await Assert.ThrowsAsync<ScenarioContractApiException>(
            () => new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", form));

        Assert.Contains(ex.Errors, e => e.Contains("SRC_001") && e.Contains("finite"));
    }

    [Fact]
    public async Task Serialize_HappyPath_ContainsNoNaNOrInfinityLiterals()
    {
        using var context = await SeededContextAsync();
        var canonical = await new CanonicalScenarioBuilder(context).BuildAsync("SCN-001", "draft", FullForm());
        var json = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);

        Assert.DoesNotContain("NaN", json);
        Assert.DoesNotContain("Infinity", json);
    }
}
