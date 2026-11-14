using System.Net;
using System.Net.Http.Json;
using AquaBlend.Data;
using AquaBlend.DTOs.Runs;
using AquaBlend.DTOs.Scenarios;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AquaBlend.Tests;

public class AquaBlendApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["InMemoryDatabaseName"] = Guid.NewGuid().ToString(),
            });
        });
    }
}

public class ScenarioEndpointsTests : IDisposable
{
    private readonly AquaBlendApiFactory _factory;
    private readonly HttpClient _client;

    public ScenarioEndpointsTests()
    {
        _factory = new AquaBlendApiFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private static ScenarioFormStateDto ValidForm(string name = "New Scenario") => new()
    {
        ScenarioName = name,
        Description = "Testing scenario creation",
        Sources = new List<ScenarioSourceSelectionDto>
        {
            new() { SourceId = "SRC_001", Enabled = true },
        },
        Plants = new List<ScenarioPlantSelectionDto>
        {
            new() { PlantId = "PLANT_001", Enabled = true },
        },
        DemandZones = new List<ScenarioDemandSelectionDto>
        {
            new() { ZoneId = "ZONE_001", DemandMlPerDay = 100 },
        },
        QualityProfileId = "STANDARD_001",
        NetworkOverrides = new List<NetworkOverrideDto>(),
    };

    [Fact]
    public async Task GetAll_ReturnsScenarios()
    {
        var response = await _client.GetAsync("/api/scenarios");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var scenarios = await response.Content.ReadFromJsonAsync<List<ScenarioSummaryDto>>();

        Assert.NotNull(scenarios);
        Assert.NotEmpty(scenarios!);
        Assert.Contains(scenarios!, s => s.ScenarioName == "Drought Scenario");
    }

    [Fact]
    public async Task GetById_ReturnsScenario()
    {
        var listResponse = await _client.GetAsync("/api/scenarios");
        listResponse.EnsureSuccessStatusCode();
        var scenarios = await listResponse.Content.ReadFromJsonAsync<List<ScenarioSummaryDto>>();

        Assert.NotNull(scenarios);
        var existing = scenarios!.First();

        var response = await _client.GetAsync($"/api/scenarios/{existing.ScenarioId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var scenario = await response.Content.ReadFromJsonAsync<ScenarioDetailDto>();
        Assert.NotNull(scenario);
        Assert.Equal(existing.ScenarioId, scenario!.ScenarioId);
        Assert.Equal(existing.ScenarioName, scenario.ScenarioName);
    }

    [Fact]
    public async Task GetById_UnknownId_ReturnsNotFound()
    {
        var response = await _client.GetAsync("/api/scenarios/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_ReturnsCreatedScenario()
    {
        var dto = ValidForm();

        var response = await _client.PostAsJsonAsync("/api/scenarios", dto);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var created = await response.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        Assert.NotNull(created);
        Assert.Equal(dto.ScenarioName, created!.ScenarioName);
        Assert.Equal(dto.Description, created.Description);
        Assert.False(string.IsNullOrWhiteSpace(created.ScenarioId));
        Assert.Equal("draft", created.Status);
        Assert.NotEqual(default, created.CreatedAt);
    }

    [Fact]
    public async Task Create_InvalidData_ReturnsBadRequest()
    {
        var invalidDto = ValidForm();
        invalidDto.ScenarioName = string.Empty;

        var response = await _client.PostAsJsonAsync("/api/scenarios", invalidDto);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_UnresolvablePlantReference_ReturnsUnprocessableEntity()
    {
        var dto = ValidForm("Unresolvable Plant Scenario");
        dto.Plants.Add(new ScenarioPlantSelectionDto { PlantId = "PLANT_DOES_NOT_EXIST", Enabled = true });

        var response = await _client.PostAsJsonAsync("/api/scenarios", dto);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("PLANT_DOES_NOT_EXIST", body);
        Assert.Contains("SCENARIO_CONTRACT_ERROR", body);
    }

    [Fact]
    public async Task Update_ExistingScenario_ReturnsUpdatedScenario()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm("Update Test Scenario"));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();
        Assert.NotNull(created);

        var updateDto = ValidForm("Updated Scenario Name");
        updateDto.Description = "Updated description";

        var updateResponse = await _client.PutAsJsonAsync($"/api/scenarios/{created!.ScenarioId}", updateDto);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();
        Assert.NotNull(updated);
        Assert.Equal(updateDto.ScenarioName, updated!.ScenarioName);
        Assert.Equal(updateDto.Description, updated.Description);

        var getResponse = await _client.GetAsync($"/api/scenarios/{created.ScenarioId}");
        getResponse.EnsureSuccessStatusCode();
        var reloaded = await getResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        Assert.NotNull(reloaded);
        Assert.Equal(updateDto.ScenarioName, reloaded!.ScenarioName);
        Assert.Equal(updateDto.Description, reloaded.Description);
    }

    [Fact]
    public async Task Update_UnknownId_ReturnsNotFound()
    {
        var response = await _client.PutAsJsonAsync("/api/scenarios/does-not-exist", ValidForm("Missing Scenario"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ExistingScenario_RemovesScenario()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm("Delete Test Scenario"));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();
        Assert.NotNull(created);

        var deleteResponse = await _client.DeleteAsync($"/api/scenarios/{created!.ScenarioId}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var getResponse = await _client.GetAsync($"/api/scenarios/{created.ScenarioId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task Delete_UnknownId_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync("/api/scenarios/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Validate_ValidScenario_MarksReady()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm("Ready Scenario"));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        var response = await _client.PostAsync($"/api/scenarios/{created!.ScenarioId}/validate", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ValidationResultDto>();
        Assert.NotNull(result);
        Assert.True(result!.Valid);
        Assert.Empty(result.Issues);
    }

    [Fact]
    public async Task Validate_EmptyScenario_ReturnsIssues()
    {
        var form = new ScenarioFormStateDto { ScenarioName = "Incomplete Scenario" };
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", form);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        var response = await _client.PostAsync($"/api/scenarios/{created!.ScenarioId}/validate", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ValidationResultDto>();
        Assert.NotNull(result);
        Assert.False(result!.Valid);
        Assert.NotEmpty(result.Issues);
    }

    [Fact]
    public async Task CreateRun_ScenarioNotReady_ReturnsConflict()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm("Never Validated"));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        var response = await _client.PostAsync($"/api/scenarios/{created!.ScenarioId}/runs", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task CreateRun_ReadyScenario_ReturnsAcceptedAndCreatesQueuedRunWithSnapshot()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm("Run Me"));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        var validateResponse = await _client.PostAsync($"/api/scenarios/{created!.ScenarioId}/validate", null);
        validateResponse.EnsureSuccessStatusCode();
        var validation = await validateResponse.Content.ReadFromJsonAsync<ValidationResultDto>();
        Assert.True(validation!.Valid);

        var runResponse = await _client.PostAsync($"/api/scenarios/{created.ScenarioId}/runs", null);
        Assert.Equal(HttpStatusCode.Accepted, runResponse.StatusCode);

        var createRun = await runResponse.Content.ReadFromJsonAsync<CreateRunResponseDto>();
        Assert.NotNull(createRun);
        Assert.Equal("accepted", createRun!.Status);

        var runStatusResponse = await _client.GetAsync($"/api/runs/{createRun.RunId}");
        Assert.Equal(HttpStatusCode.OK, runStatusResponse.StatusCode);
        var aggregate = await runStatusResponse.Content.ReadFromJsonAsync<RunAggregateDto>();

        Assert.NotNull(aggregate);
        Assert.Equal("queued", aggregate!.Run.Status);
        Assert.Null(aggregate.Run.Error);
        Assert.False(aggregate.Run.ForceRerun);
        Assert.False(aggregate.Run.MilpCacheHit);
        Assert.False(aggregate.Run.AiCacheHit);
        Assert.NotNull(aggregate.Run.MilpInputId);

        Assert.NotNull(aggregate.Input);
        Assert.Equal("pending", aggregate.Input!.InputStatus);
        Assert.Null(aggregate.Input.ScenarioDataJson);
        Assert.Null(aggregate.Input.ModelParametersJson);
        Assert.Null(aggregate.Input.InputHash);

        Assert.Null(aggregate.MilpOutput);
        Assert.Null(aggregate.AiOutput);
    }

    [Fact]
    public async Task CreateRun_ForceRerunTrue_IsRecordedButDoesNotAffectCacheFlags()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/scenarios", ValidForm("Force Rerun Me"));
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<ScenarioDetailDto>();

        (await _client.PostAsync($"/api/scenarios/{created!.ScenarioId}/validate", null)).EnsureSuccessStatusCode();

        var runResponse = await _client.PostAsJsonAsync(
            $"/api/scenarios/{created.ScenarioId}/runs",
            new CreateRunRequestDto { ForceRerun = true });
        Assert.Equal(HttpStatusCode.Accepted, runResponse.StatusCode);
        var createRun = await runResponse.Content.ReadFromJsonAsync<CreateRunResponseDto>();

        var aggregateResponse = await _client.GetAsync($"/api/runs/{createRun!.RunId}");
        var aggregate = await aggregateResponse.Content.ReadFromJsonAsync<RunAggregateDto>();

        Assert.True(aggregate!.Run.ForceRerun);
        Assert.False(aggregate.Run.MilpCacheHit);
        Assert.False(aggregate.Run.AiCacheHit);
    }
}
