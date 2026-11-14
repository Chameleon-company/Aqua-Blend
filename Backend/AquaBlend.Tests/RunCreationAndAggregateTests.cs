using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using AquaBlend.Data;
using AquaBlend.DTOs.Runs;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AquaBlend.Tests;

/// <summary>
/// Covers AquaBlend_Backend_Final_Integration_Implementation.md §26's required test list end to
/// end, through the real HTTP pipeline (AquaBlendApiFactory, shared with ScenarioEndpointsTests)
/// plus direct scoped-DbContext assertions/seeding for state the API surface does not expose
/// (e.g. milp_model_input rows, or simulating a corrupted stored scenario).
/// </summary>
public class RunCreationAndAggregateTests : IDisposable
{
    private readonly AquaBlendApiFactory _factory;
    private readonly HttpClient _client;

    public RunCreationAndAggregateTests()
    {
        _factory = new AquaBlendApiFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private AquaBlendDbContext NewDbContext() =>
        _factory.Services.CreateScope().ServiceProvider.GetRequiredService<AquaBlendDbContext>();

    private static ScenarioFormStateDto ValidForm(string name) => new()
    {
        ScenarioName = name,
        Description = "Run/aggregate test scenario",
        Sources = new List<ScenarioSourceSelectionDto> { new() { SourceId = "SRC_001", Enabled = true } },
        Plants = new List<ScenarioPlantSelectionDto> { new() { PlantId = "PLANT_001", Enabled = true } },
        DemandZones = new List<ScenarioDemandSelectionDto> { new() { ZoneId = "ZONE_001", DemandMlPerDay = 100 } },
        QualityProfileId = "STANDARD_001",
        NetworkOverrides = new List<NetworkOverrideDto>(),
    };

    /// <summary>Creates and validates a scenario, returning its external ID.</summary>
    private async Task<string> CreateReadyScenarioAsync(string name)
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm(name));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        var validateResponse = await _client.PostAsync($"/api/scenarios/{created!.ScenarioId}/validate", null);
        validateResponse.EnsureSuccessStatusCode();
        var validation = await validateResponse.Content.ReadFromJsonAsync<ValidationResultDto>();
        Assert.True(validation!.Valid);

        return created.ScenarioId;
    }

    private async Task<string> CreateRunAsync(string scenarioId, bool forceRerun = false)
    {
        var response = await _client.PostAsJsonAsync(
            $"/api/scenarios/{scenarioId}/runs",
            new CreateRunRequestDto { ForceRerun = forceRerun });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CreateRunResponseDto>();
        return body!.RunId;
    }

    // Test 1 — new run creates a pending input snapshot.
    [Fact]
    public async Task CreateRunAsync_CreatesPendingMilpModelInputSnapshot()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test1 Scenario");
        var runId = await CreateRunAsync(scenarioId);

        using var db = NewDbContext();
        var run = await db.Runs.FirstAsync(r => r.ExternalId == runId);
        Assert.Equal("queued", run.WorkflowStatus);
        Assert.NotNull(run.MilpInputId);

        var input = await db.MilpModelInputs.FirstOrDefaultAsync(i => i.RunId == run.Id);
        Assert.NotNull(input);
        Assert.Equal("pending", input!.InputStatus);
        Assert.Equal(run.MilpInputId, input.Id);
    }

    // Test 2 — canonical JSON is snapshotted exactly.
    [Fact]
    public async Task CreateRunAsync_CanonicalInputJson_MatchesScenarioFormStateAtCreationTime()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test2 Scenario");
        var runId = await CreateRunAsync(scenarioId);

        using var db = NewDbContext();
        var scenario = await db.Scenarios.FirstAsync(s => s.ExternalId == scenarioId);
        var run = await db.Runs.FirstAsync(r => r.ExternalId == runId);
        var input = await db.MilpModelInputs.FirstAsync(i => i.RunId == run.Id);

        Assert.Equal(scenario.FormStateJson, input.CanonicalInputJson);
    }

    // Test 3 — Python-owned fields are not fabricated.
    [Fact]
    public async Task CreateRunAsync_PythonOwnedFields_RemainNull()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test3 Scenario");
        var runId = await CreateRunAsync(scenarioId);

        using var db = NewDbContext();
        var run = await db.Runs.FirstAsync(r => r.ExternalId == runId);
        var input = await db.MilpModelInputs.FirstAsync(i => i.RunId == run.Id);

        Assert.Null(input.ScenarioDataJson);
        Assert.Null(input.ModelParametersJson);
        Assert.Null(input.CanonicalInputHash);
        Assert.Null(input.ScenarioDataHash);
        Assert.Null(input.ModelParametersHash);
        Assert.Null(input.InputHash);
        Assert.Null(input.SolverConfigHash);
        Assert.Null(input.ExecutionKey);
        Assert.Null(input.ResolvedAt);
    }

    // Test 4 — cache flags initialize correctly, both for a normal and a forced run.
    [Fact]
    public async Task CreateRunAsync_CacheFlags_InitializeFalseRegardlessOfForceRerun()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test4 Scenario");

        var normalRunId = await CreateRunAsync(scenarioId, forceRerun: false);
        var forcedRunId = await CreateRunAsync(scenarioId, forceRerun: true);

        using var db = NewDbContext();
        var normalRun = await db.Runs.FirstAsync(r => r.ExternalId == normalRunId);
        var forcedRun = await db.Runs.FirstAsync(r => r.ExternalId == forcedRunId);

        Assert.False(normalRun.ForceRerun);
        Assert.False(normalRun.MilpCacheHit);
        Assert.False(normalRun.AiCacheHit);

        Assert.True(forcedRun.ForceRerun);
        Assert.False(forcedRun.MilpCacheHit);
        Assert.False(forcedRun.AiCacheHit);
    }

    // Test 5 — transactional rollback: if snapshot creation fails, no queued Run and no
    // milp_model_input row remain.
    [Fact]
    public async Task CreateRunAsync_SnapshotCreationFails_RollsBackRunCreation()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test5 Scenario");

        // Corrupt the stored canonical document directly so MilpInputSnapshotService's
        // "is this canonical?" check fails — status stays "ready" so RunService's own
        // pre-check still passes and the failure is isolated to snapshot creation.
        using (var db = NewDbContext())
        {
            var scenario = await db.Scenarios.FirstAsync(s => s.ExternalId == scenarioId);
            scenario.FormStateJson = "{}";
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsJsonAsync(
            $"/api/scenarios/{scenarioId}/runs", new CreateRunRequestDto());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);

        using var verifyDb = NewDbContext();
        var scenarioRow = await verifyDb.Scenarios.FirstAsync(s => s.ExternalId == scenarioId);
        Assert.False(await verifyDb.Runs.AnyAsync(r => r.ScenarioId == scenarioRow.Id));
        Assert.False(await verifyDb.MilpModelInputs.AnyAsync(i => i.ScenarioId == scenarioRow.Id));
    }

    // Test 6 — a canonical document whose scenario_id disagrees with Scenarios.ExternalId is
    // rejected with 422, distinct from Test 5's "not canonical at all" case.
    [Fact]
    public async Task CreateRunAsync_CanonicalScenarioIdMismatch_Returns422()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test6 Scenario");

        using (var db = NewDbContext())
        {
            var scenario = await db.Scenarios.FirstAsync(s => s.ExternalId == scenarioId);
            var node = JsonNode.Parse(scenario.FormStateJson)!.AsObject();
            node["scenario_id"] = "SCN-DOES-NOT-MATCH";
            scenario.FormStateJson = node.ToJsonString();
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsJsonAsync(
            $"/api/scenarios/{scenarioId}/runs", new CreateRunRequestDto());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("does not match", body);

        using var verifyDb = NewDbContext();
        var scenarioRow = await verifyDb.Scenarios.FirstAsync(s => s.ExternalId == scenarioId);
        Assert.False(await verifyDb.Runs.AnyAsync(r => r.ScenarioId == scenarioRow.Id));
    }

    // Test 7 — aggregate endpoint for a queued run: input present, outputs absent.
    [Fact]
    public async Task GetAggregate_QueuedRun_ReturnsRunAndInputWithNullOutputs()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test7 Scenario");
        var runId = await CreateRunAsync(scenarioId);

        var response = await _client.GetAsync($"/api/runs/{runId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var aggregate = await response.Content.ReadFromJsonAsync<RunAggregateDto>();

        Assert.NotNull(aggregate);
        Assert.Equal("queued", aggregate!.Run.Status);
        Assert.NotNull(aggregate.Input);
        Assert.Null(aggregate.MilpOutput);
        Assert.Null(aggregate.AiOutput);
    }

    // Test 8 — once a milp_model_output is linked, the aggregate endpoint returns it.
    [Fact]
    public async Task GetAggregate_WithLinkedMilpOutput_ReturnsMilpOutput()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test8 Scenario");
        var runId = await CreateRunAsync(scenarioId);

        using (var db = NewDbContext())
        {
            var run = await db.Runs.FirstAsync(r => r.ExternalId == runId);
            var output = new MilpModelOutput
            {
                Id = Guid.NewGuid(),
                OriginRunId = run.Id,
                InputId = run.MilpInputId,
                RawOutputJson = "{\"solver\":{\"status\":\"OPTIMAL\"}}",
                SolverStatus = "OPTIMAL",
                SolverIsOptimal = true,
                TotalCost = 12345.0,
                CacheReusable = true,
            };
            db.MilpModelOutputs.Add(output);
            run.MilpOutputId = output.Id;
            run.WorkflowStatus = "milp_completed";
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync($"/api/runs/{runId}");
        var aggregate = await response.Content.ReadFromJsonAsync<RunAggregateDto>();

        Assert.NotNull(aggregate!.MilpOutput);
        Assert.False(aggregate.MilpOutput!.IsLegacyFallback);
        Assert.Equal("OPTIMAL", aggregate.MilpOutput.SolverStatus);
        Assert.Equal(12345.0, aggregate.MilpOutput.TotalCost);
        Assert.Null(aggregate.AiOutput);
    }

    // Test 9 — once a milp_ai_output is also linked, the aggregate endpoint returns both.
    [Fact]
    public async Task GetAggregate_WithLinkedAiOutput_ReturnsBothOutputs()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test9 Scenario");
        var runId = await CreateRunAsync(scenarioId);

        using (var db = NewDbContext())
        {
            var run = await db.Runs.FirstAsync(r => r.ExternalId == runId);
            var scenario = await db.Scenarios.FirstAsync(s => s.Id == run.ScenarioId);

            var output = new MilpModelOutput
            {
                Id = Guid.NewGuid(),
                OriginRunId = run.Id,
                InputId = run.MilpInputId,
                RawOutputJson = "{\"solver\":{\"status\":\"OPTIMAL\"}}",
                SolverStatus = "OPTIMAL",
                CacheReusable = true,
            };
            db.MilpModelOutputs.Add(output);

            var aiOutput = new MilpAiOutput
            {
                Id = Guid.NewGuid(),
                OriginRunId = run.Id,
                MilpOutputId = output.Id,
                ScenarioId = scenario.Id,
                Status = "completed",
                ExecutiveSummary = "Looks fine.",
                AiInputJson = "{}",
            };
            db.MilpAiOutputs.Add(aiOutput);

            run.MilpOutputId = output.Id;
            run.AiOutputId = aiOutput.Id;
            run.WorkflowStatus = "completed";
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync($"/api/runs/{runId}");
        var aggregate = await response.Content.ReadFromJsonAsync<RunAggregateDto>();

        Assert.NotNull(aggregate!.MilpOutput);
        Assert.NotNull(aggregate.AiOutput);
        Assert.Equal("completed", aggregate.AiOutput!.Status);
        Assert.Equal("Looks fine.", aggregate.AiOutput.ExecutiveSummary);
    }

    // Test 10 — a pre-integration run (MilpOutputId == null) with a legacy OptimisationResults
    // row stays readable via the aggregate endpoint's compatibility fallback.
    [Fact]
    public async Task GetAggregate_LegacyRunWithoutMilpOutputId_FallsBackToOptimisationResults()
    {
        // RUN-1001 is seeded by Data/SeedData.cs with an OptimisationResult and no MilpOutputId.
        var response = await _client.GetAsync("/api/runs/RUN-1001");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var aggregate = await response.Content.ReadFromJsonAsync<RunAggregateDto>();

        Assert.NotNull(aggregate!.MilpOutput);
        Assert.True(aggregate.MilpOutput!.IsLegacyFallback);
        Assert.Equal("OPTIMAL", aggregate.MilpOutput.SolverStatus);
        Assert.Equal(184150.00, aggregate.MilpOutput.TotalCost);
    }

    // Test 11 — editing a Scenario after a Run exists must not mutate that run's historical
    // milp_model_input snapshot.
    [Fact]
    public async Task UpdateScenario_AfterRunCreated_DoesNotMutateHistoricalSnapshot()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test11 Scenario Original");
        var runId = await CreateRunAsync(scenarioId);

        string originalCanonicalJson;
        using (var db = NewDbContext())
        {
            var run = await db.Runs.FirstAsync(r => r.ExternalId == runId);
            var input = await db.MilpModelInputs.FirstAsync(i => i.RunId == run.Id);
            originalCanonicalJson = input.CanonicalInputJson;
        }

        var updatedForm = ValidForm("Test11 Scenario Renamed");
        updatedForm.DemandZones[0].DemandMlPerDay = 999;
        var updateResponse = await _client.PutAsJsonAsync($"/api/scenarios/{scenarioId}", updatedForm);
        updateResponse.EnsureSuccessStatusCode();

        using var verifyDb = NewDbContext();
        var runAfterEdit = await verifyDb.Runs.FirstAsync(r => r.ExternalId == runId);
        var inputAfterEdit = await verifyDb.MilpModelInputs.FirstAsync(i => i.RunId == runAfterEdit.Id);

        Assert.Equal(originalCanonicalJson, inputAfterEdit.CanonicalInputJson);
        Assert.DoesNotContain("Test11 Scenario Renamed", inputAfterEdit.CanonicalInputJson);
    }

    // Test 12 — the backend must not cache by Scenario ID: two runs against the same scenario
    // each get their own milp_model_input, and the second is never auto-marked as a cache hit.
    [Fact]
    public async Task CreateRunAsync_TwiceForSameScenario_NeverClaimsACacheHit()
    {
        var scenarioId = await CreateReadyScenarioAsync("Test12 Scenario");

        var firstRunId = await CreateRunAsync(scenarioId);
        var secondRunId = await CreateRunAsync(scenarioId);

        using var db = NewDbContext();
        var firstRun = await db.Runs.FirstAsync(r => r.ExternalId == firstRunId);
        var secondRun = await db.Runs.FirstAsync(r => r.ExternalId == secondRunId);

        Assert.NotEqual(firstRun.MilpInputId, secondRun.MilpInputId);

        var firstInput = await db.MilpModelInputs.FirstAsync(i => i.RunId == firstRun.Id);
        var secondInput = await db.MilpModelInputs.FirstAsync(i => i.RunId == secondRun.Id);
        Assert.NotEqual(firstInput.Id, secondInput.Id);

        Assert.False(secondRun.MilpCacheHit);
    }
}
