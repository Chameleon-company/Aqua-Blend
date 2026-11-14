using System.Text.Json;
using AquaBlend.Contracts.Milp;
using AquaBlend.Data;
using AquaBlend.DTOs.Common;
using AquaBlend.Entities;
using AquaBlend.Exceptions;

namespace AquaBlend.Services;

/// <summary>
/// Creates the one immutable milp_model_input snapshot for a newly created Run
/// (AquaBlend_Backend_Final_Integration_Implementation.md §12). Deliberately narrow: this service
/// only freezes what the backend already knows (the canonical scenario document and its
/// frontend-compatible reverse mapping) into a new row. It must never compute ScenarioData,
/// ModelParameters, MILP cache identity, or runtime hashes — those are exclusively Python
/// data_loader.py / preprocessing.py / worker responsibilities and are left NULL here.
///
/// Called by Services/RunService.cs inside the same DB transaction as the Run row's creation, so
/// a committed "queued" Run is never visible to the MILP worker without its snapshot.
/// </summary>
public class MilpInputSnapshotService
{
    private readonly AquaBlendDbContext _context;
    private readonly ScenarioJsonAdapter _jsonAdapter;

    public MilpInputSnapshotService(AquaBlendDbContext context, ScenarioJsonAdapter jsonAdapter)
    {
        _context = context;
        _jsonAdapter = jsonAdapter;
    }

    public async Task<MilpModelInput> CreatePendingSnapshotAsync(
        Run run,
        Scenario scenario,
        CancellationToken cancellationToken = default)
    {
        var json = scenario.FormStateJson;
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ScenarioContractApiException(new[]
            {
                $"Scenario '{scenario.ExternalId}' has no stored form state to snapshot for a run.",
            });
        }

        if (!ScenarioJsonAdapter.LooksCanonical(json))
        {
            throw new ScenarioContractApiException(new[]
            {
                $"Scenario '{scenario.ExternalId}': stored form state is not a canonical MILP document. " +
                "A scenario must be saved through the current ScenarioService before it can be run.",
            });
        }

        var canonical = JsonSerializer.Deserialize<CanonicalMilpScenario>(json, MilpJsonDefaults.Options)
            ?? throw new ScenarioContractApiException(new[]
            {
                $"Scenario '{scenario.ExternalId}': stored canonical JSON could not be parsed.",
            });

        // Scenarios.ExternalId is authoritative — never persist a snapshot whose embedded
        // scenario_id disagrees with the row it was read from.
        if (!string.Equals(canonical.ScenarioId, scenario.ExternalId, StringComparison.Ordinal))
        {
            throw new ScenarioContractApiException(new[]
            {
                $"Scenario '{scenario.ExternalId}': stored scenario_id '{canonical.ScenarioId}' does not match Scenarios.ExternalId.",
            });
        }

        // Reuse the existing reverse adapter rather than writing a second UI-form projection.
        var frontendForm = await _jsonAdapter.ToFormStateAsync(scenario);

        var snapshot = new MilpModelInput
        {
            Id = Guid.NewGuid(),

            RunId = run.Id,
            ScenarioId = scenario.Id,
            RunExternalId = run.ExternalId,
            ScenarioExternalId = scenario.ExternalId,

            InputStatus = "pending",
            InputContractVersion = "1.0",
            MilpModelVersion = null,

            ScenarioName = canonical.ScenarioName,
            ScenarioStatus = canonical.Status,

            DataSourceType = canonical.DataSource.Type,
            DataSourceView = canonical.DataSource.View,
            AllowEstimatedValues = canonical.DataSource.AllowEstimatedValues,

            FailIfSourceMissingFromDatabase = canonical.Validation.FailIfSourceMissingFromDatabase,
            FailIfDailyAvailabilityMissing = canonical.Validation.FailIfDailyAvailabilityMissing,
            FailIfRequiredQualityValueMissing = canonical.Validation.FailIfRequiredQualityValueMissing,
            FailIfDemandMissing = canonical.Validation.FailIfDemandMissing,

            Sources = JsonSerializer.Serialize(canonical.Sources, MilpJsonDefaults.Options),
            Plants = JsonSerializer.Serialize(canonical.Network.Plants, MilpJsonDefaults.Options),
            DemandZones = JsonSerializer.Serialize(canonical.Network.DemandZones, MilpJsonDefaults.Options),
            SourceToPlantLinks = JsonSerializer.Serialize(canonical.Network.SourceToPlantLinks, MilpJsonDefaults.Options),
            PlantToZoneLinks = JsonSerializer.Serialize(canonical.Network.PlantToZoneLinks, MilpJsonDefaults.Options),
            QualityLimits = canonical.QualityLimits is null
                ? "null"
                : JsonSerializer.Serialize(canonical.QualityLimits, MilpJsonDefaults.Options),
            ValidationPolicy = JsonSerializer.Serialize(canonical.Validation, MilpJsonDefaults.Options),

            // frontend_input_json uses the HTTP-layer camelCase policy (matches what the
            // frontend itself would receive from GET /api/scenarios/{id}) — canonical_input_json
            // below is the snake_case MILP document. copied verbatim, not re-serialized, so it is
            // byte-for-byte the exact document Scenarios.FormStateJson held at run creation.
            FrontendInputJson = JsonSerializer.Serialize(frontendForm, JsonDefaults.Options),
            CanonicalInputJson = json,

            SourceDataSnapshotJson = "[]",
            ScenarioDataJson = null,
            ModelParametersJson = null,

            SolverConfigJson = "{}",

            CanonicalInputHash = null,
            ScenarioDataHash = null,
            ModelParametersHash = null,
            InputHash = null,
            SolverConfigHash = null,
            ExecutionKey = null,

            ScenarioDataSchemaVersion = "1.0",
            ModelParametersSchemaVersion = "1.0",

            ResolvedAt = null,
        };

        _context.MilpModelInputs.Add(snapshot);
        await _context.SaveChangesAsync(cancellationToken);

        return snapshot;
    }
}
