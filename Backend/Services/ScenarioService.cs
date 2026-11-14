using System.Text.Json;
using AquaBlend.Data;
using AquaBlend.DTOs.Common;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services
{
    public class ScenarioService
    {
        private readonly AquaBlendDbContext _context;
        private readonly CanonicalScenarioBuilder _canonicalBuilder;
        private readonly ScenarioJsonAdapter _jsonAdapter;

        public ScenarioService(AquaBlendDbContext context, CanonicalScenarioBuilder canonicalBuilder, ScenarioJsonAdapter jsonAdapter)
        {
            _context = context;
            _canonicalBuilder = canonicalBuilder;
            _jsonAdapter = jsonAdapter;
        }

        public async Task<List<ScenarioSummaryDto>> GetAllAsync()
        {
            var scenarios = await _context.Scenarios
                .AsNoTracking()
                .Include(s => s.Runs)
                .ToListAsync();

            var formStatesByScenarioId = await _jsonAdapter.ToFormStateBatchAsync(scenarios);

            var result = scenarios
                .Select(scenario => ToSummaryDto(scenario, formStatesByScenarioId[scenario.Id]))
                .OrderByDescending(s => s.UpdatedAt)
                .ToList();

            return result;
        }

        public async Task<ScenarioDetailDto?> GetByExternalIdAsync(string scenarioId)
        {
            var scenario = await _context.Scenarios
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.ExternalId == scenarioId);

            return scenario is null ? null : await ToDetailDtoAsync(scenario);
        }

        public async Task<ScenarioDetailDto> CreateAsync(ScenarioFormStateDto form)
        {
            var scenario = new Scenario
            {
                Status = "draft",
                FormStateJson = "{}",
                ValidationIssuesJson = "[]",
            };

            _context.Scenarios.Add(scenario);
            await _context.SaveChangesAsync();

            scenario.ExternalId = $"SCN-{scenario.Id:D3}";

            // Resolve the user's selections against reference data into the canonical MILP
            // document *before* the second save, so ExternalId is already known and
            // scenario_id == Scenarios.ExternalId holds from the first persisted row onward
            // (AquaBlend_Claude_Canonical_Scenario_JSON.md Phase 4). Throws
            // ScenarioContractApiException (422) rather than persisting on an unresolvable
            // reference — never guessed/fabricated fallback values.
            var canonical = await _canonicalBuilder.BuildAsync(scenario.ExternalId, scenario.Status, form);
            scenario.FormStateJson = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);

            await _context.SaveChangesAsync();

            return await ToDetailDtoAsync(scenario);
        }

        public async Task<ScenarioDetailDto?> UpdateAsync(string scenarioId, ScenarioFormStateDto form)
        {
            var scenario = await _context.Scenarios.FirstOrDefaultAsync(s => s.ExternalId == scenarioId);
            if (scenario is null) return null;

            // Any edit invalidates a prior validation pass — the scenario must be re-validated
            // before it can be run again (mirrors the frontend mock's updateScenario behaviour).
            var canonical = await _canonicalBuilder.BuildAsync(scenario.ExternalId, "draft", form);
            scenario.FormStateJson = JsonSerializer.Serialize(canonical, MilpJsonDefaults.Options);
            scenario.Status = "draft";
            scenario.ValidationIssuesJson = "[]";

            await _context.SaveChangesAsync();
            return await ToDetailDtoAsync(scenario);
        }

        public async Task<bool> DeleteAsync(string scenarioId)
        {
            var scenario = await _context.Scenarios.FirstOrDefaultAsync(s => s.ExternalId == scenarioId);
            if (scenario is null) return false;

            _context.Scenarios.Remove(scenario);
            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Authoritative backend validation (integration.md §5.2/§8). Ports the same rules the
        /// frontend mock enforces client-side in services/mock/mockClient.ts's runValidation() —
        /// this is the server-side source of truth those rules were always meant to become.
        ///
        /// This is the "is this scenario ready to run" completeness gate — distinct from
        /// CanonicalScenarioBuilder's data-integrity checks (which reject unresolvable
        /// references at save time). An empty/incomplete draft can always be saved; it just
        /// can't pass this check until it's complete. Unchanged by the canonical-JSON migration:
        /// it still operates on a ScenarioFormStateDto, now sourced via ScenarioJsonAdapter so it
        /// works identically whether the stored row is canonical or legacy-format.
        /// </summary>
        public async Task<ValidationResultDto?> ValidateAsync(string scenarioId)
        {
            var scenario = await _context.Scenarios.FirstOrDefaultAsync(s => s.ExternalId == scenarioId);
            if (scenario is null) return null;

            var form = await _jsonAdapter.ToFormStateAsync(scenario);
            var issues = new List<ValidationIssueDto>();

            if (string.IsNullOrWhiteSpace(form.ScenarioName))
            {
                issues.Add(new ValidationIssueDto { Message = "Scenario name is required.", Field = "scenarioName", Severity = "error" });
            }

            var enabledSourceIds = form.Sources
                .Where(s => s.Enabled && !(s.ForcedInactive ?? false))
                .Select(s => s.SourceId)
                .ToHashSet();

            if (enabledSourceIds.Count == 0)
            {
                issues.Add(new ValidationIssueDto { Message = "At least one source must be enabled.", Field = "sources", Severity = "error" });
            }

            var enabledPlantIds = form.Plants.Where(p => p.Enabled).Select(p => p.PlantId).ToHashSet();
            if (enabledPlantIds.Count == 0)
            {
                issues.Add(new ValidationIssueDto { Message = "At least one treatment plant must be enabled.", Field = "plants", Severity = "error" });
            }

            if (form.DemandZones.Count == 0)
            {
                issues.Add(new ValidationIssueDto { Message = "At least one demand zone is required.", Field = "demandZones", Severity = "error" });
            }

            var zoneNames = await _context.DemandZones.AsNoTracking()
                .ToDictionaryAsync(z => z.ExternalId, z => z.Name);

            foreach (var zone in form.DemandZones)
            {
                var label = zoneNames.GetValueOrDefault(zone.ZoneId, zone.ZoneId);
                if (zone.DemandMlPerDay is null)
                {
                    issues.Add(new ValidationIssueDto { Message = $"{label} demand has not been entered.", Field = "demandZones", Severity = "error" });
                }
                else if (zone.DemandMlPerDay <= 0)
                {
                    issues.Add(new ValidationIssueDto { Message = $"{label} demand must be greater than zero.", Field = "demandZones", Severity = "error" });
                }
            }

            if (string.IsNullOrWhiteSpace(form.QualityProfileId))
            {
                issues.Add(new ValidationIssueDto { Message = "A water-quality profile must be selected.", Field = "qualityProfileId", Severity = "error" });
            }

            var sourceInfo = await _context.WaterSources.AsNoTracking()
                .Where(s => enabledSourceIds.Contains(s.ExternalId))
                .ToDictionaryAsync(s => s.ExternalId, s => new { s.Name, s.ModelReady });

            foreach (var sourceId in enabledSourceIds)
            {
                if (sourceInfo.TryGetValue(sourceId, out var info) && !info.ModelReady)
                {
                    issues.Add(new ValidationIssueDto { Message = $"{info.Name} is missing required model data.", Field = "sources", Severity = "error" });
                }
            }

            var reachableZoneIds = await ReachableZoneIdsAsync(enabledSourceIds, enabledPlantIds);
            foreach (var zone in form.DemandZones)
            {
                if (zone.DemandMlPerDay is > 0 && !reachableZoneIds.Contains(zone.ZoneId))
                {
                    var label = zoneNames.GetValueOrDefault(zone.ZoneId, zone.ZoneId);
                    issues.Add(new ValidationIssueDto { Message = $"{label} has no valid path from an available source.", Field = "demandZones", Severity = "error" });
                }
            }

            var valid = !issues.Any(i => i.Severity == "error");
            scenario.Status = valid ? "ready" : "invalid";
            scenario.ValidationIssuesJson = JsonSerializer.Serialize(issues, JsonDefaults.Options);

            // Keep FormStateJson.status in lockstep with the row's authoritative Status
            // (AquaBlend_Claude_Canonical_Scenario_JSON.md Phase 4/7) — a canonical document's
            // embedded status must never go stale relative to Scenarios.Status.
            var syncedJson = _jsonAdapter.TrySyncStatus(scenario);
            if (syncedJson is not null)
            {
                scenario.FormStateJson = syncedJson;
            }

            await _context.SaveChangesAsync();

            return new ValidationResultDto { Valid = valid, Issues = issues };
        }

        /// <summary>Demand zones reachable from at least one enabled source through an enabled
        /// source→plant link into an enabled plant→zone link, restricted to enabled plants.</summary>
        private async Task<HashSet<string>> ReachableZoneIdsAsync(HashSet<string> enabledSourceIds, HashSet<string> enabledPlantIds)
        {
            var reachablePlantIds = await _context.SourcePlantLinks.AsNoTracking()
                .Include(l => l.Source)
                .Include(l => l.Plant)
                .Where(l => l.Enabled
                    && enabledSourceIds.Contains(l.Source.ExternalId)
                    && enabledPlantIds.Contains(l.Plant.ExternalId))
                .Select(l => l.Plant.ExternalId)
                .Distinct()
                .ToListAsync();

            var reachablePlantIdSet = reachablePlantIds.ToHashSet();

            var reachableZoneIds = await _context.PlantZoneLinks.AsNoTracking()
                .Include(l => l.Plant)
                .Include(l => l.Zone)
                .Where(l => l.Enabled && reachablePlantIdSet.Contains(l.Plant.ExternalId))
                .Select(l => l.Zone.ExternalId)
                .Distinct()
                .ToListAsync();

            return reachableZoneIds.ToHashSet();
        }

        private static List<ValidationIssueDto> DeserializeIssues(Scenario scenario) =>
            JsonSerializer.Deserialize<List<ValidationIssueDto>>(scenario.ValidationIssuesJson, JsonDefaults.Options)
            ?? new List<ValidationIssueDto>();

        private async Task<ScenarioDetailDto> ToDetailDtoAsync(Scenario scenario)
        {
            var form = await _jsonAdapter.ToFormStateAsync(scenario);
            return new ScenarioDetailDto
            {
                ScenarioId = scenario.ExternalId,
                ScenarioName = form.ScenarioName,
                Description = form.Description,
                Sources = form.Sources,
                Plants = form.Plants,
                DemandZones = form.DemandZones,
                QualityProfileId = form.QualityProfileId,
                NetworkOverrides = form.NetworkOverrides,
                Status = scenario.Status,
                ValidationIssues = DeserializeIssues(scenario),
                CreatedAt = scenario.CreatedAt,
                UpdatedAt = scenario.UpdatedAt ?? scenario.CreatedAt,
            };
        }

        private static ScenarioSummaryDto ToSummaryDto(Scenario scenario, ScenarioFormStateDto form)
        {
            var mostRecentRun = scenario.Runs.OrderByDescending(r => r.CreatedAt).FirstOrDefault();

            return new ScenarioSummaryDto
            {
                ScenarioId = scenario.ExternalId,
                ScenarioName = form.ScenarioName,
                Status = scenario.Status,
                Description = form.Description,
                UpdatedAt = scenario.UpdatedAt ?? scenario.CreatedAt,
                MostRecentRun = mostRecentRun is null ? null : new ScenarioRunRefDto
                {
                    RunId = mostRecentRun.ExternalId,
                    Status = mostRecentRun.WorkflowStatus,
                    CreatedAt = mostRecentRun.CreatedAt,
                },
            };
        }
    }
}
