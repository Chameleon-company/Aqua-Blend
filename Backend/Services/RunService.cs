using System.Text.Json;
using AquaBlend.Data;
using AquaBlend.Domain;
using AquaBlend.DTOs.Ai;
using AquaBlend.DTOs.Milp;
using AquaBlend.DTOs.Runs;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using AquaBlend.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services;

public class RunService
{
    private readonly AquaBlendDbContext _context;
    private readonly ScenarioJsonAdapter _jsonAdapter;
    private readonly ScenarioService _scenarioService;
    private readonly MilpInputSnapshotService _snapshotService;

    public RunService(
        AquaBlendDbContext context,
        ScenarioJsonAdapter jsonAdapter,
        ScenarioService scenarioService,
        MilpInputSnapshotService snapshotService)
    {
        _context = context;
        _jsonAdapter = jsonAdapter;
        _scenarioService = scenarioService;
        _snapshotService = snapshotService;
    }

    /// <summary>
    /// Creates a Run and its one immutable milp_model_input snapshot atomically
    /// (AquaBlend_Backend_Final_Integration_Implementation.md §13). The Python MILP worker must
    /// never be able to observe a committed "queued" Run without its snapshot, so both writes
    /// happen inside a single DB transaction (real, relational-provider transaction in
    /// production; a manual compensating delete under the EF InMemory test provider, which does
    /// not support rolling back already-applied SaveChanges — see the catch block below).
    ///
    /// Deliberately does NOT decide a MILP cache hit here — ForceRerun is recorded verbatim and
    /// MilpCacheHit/AiCacheHit always start false; only the MILP/AI worker, once real
    /// ModelParameters exist, may set them true (§14).
    /// </summary>
    public async Task<CreateRunResponseDto> CreateRunAsync(string scenarioId, bool forceRerun = false)
    {
        var scenario = await _context.Scenarios.FirstOrDefaultAsync(s => s.ExternalId == scenarioId);
        if (scenario is null)
            throw new NotFoundApiException($"Scenario \"{scenarioId}\" was not found.");

        if (scenario.Status != "ready")
            throw new ConflictApiException("RUN_CREATION_FAILED", "The scenario must pass validation before an optimisation can be run.");

        var isRelational = _context.Database.IsRelational();
        var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;

        var run = new Run
        {
            ExternalId = Guid.NewGuid().ToString("N"),
            ScenarioId = scenario.Id,
            WorkflowStatus = RunWorkflowStatuses.Queued,
            ForceRerun = forceRerun,
            MilpCacheHit = false,
            AiCacheHit = false,
        };

        try
        {
            _context.Runs.Add(run);
            await _context.SaveChangesAsync();

            run.ExternalId = $"RUN-{1000 + run.Id}";
            await _context.SaveChangesAsync();

            var snapshot = await _snapshotService.CreatePendingSnapshotAsync(run, scenario);

            run.MilpInputId = snapshot.Id;
            await _context.SaveChangesAsync();

            if (transaction is not null)
            {
                await transaction.CommitAsync();
            }
        }
        catch
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync();
            }
            else if (run.Id != 0)
            {
                // Non-relational (test) provider: BeginTransaction/Rollback do not actually undo
                // already-applied SaveChanges, so compensate explicitly. Any milp_model_input row
                // is removed first — it would otherwise be orphaned once the Run it points back
                // to is gone.
                var orphanInput = await _context.MilpModelInputs.FirstOrDefaultAsync(i => i.RunId == run.Id);
                if (orphanInput is not null)
                {
                    _context.MilpModelInputs.Remove(orphanInput);
                }

                _context.Runs.Remove(run);
                await _context.SaveChangesAsync();
            }

            throw;
        }
        finally
        {
            transaction?.Dispose();
        }

        return new CreateRunResponseDto { RunId = run.ExternalId, Status = "accepted" };
    }

    public async Task<List<RunSummaryDto>> GetScenarioRunsAsync(string scenarioId)
    {
        var scenario = await _context.Scenarios.AsNoTracking().FirstOrDefaultAsync(s => s.ExternalId == scenarioId);
        if (scenario is null)
            throw new NotFoundApiException($"Scenario \"{scenarioId}\" was not found.");

        var runs = await _context.Runs.AsNoTracking()
            .Where(r => r.ScenarioId == scenario.Id)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return runs.Select(r => new RunSummaryDto
        {
            RunId = r.ExternalId,
            ScenarioId = scenario.ExternalId,
            Status = r.WorkflowStatus,
            SolverOutcome = r.SolverOutcome,
            CreatedAt = r.CreatedAt,
            ForceRerun = r.ForceRerun,
            MilpCacheHit = r.MilpCacheHit,
            AiCacheHit = r.AiCacheHit,
        }).ToList();
    }

    /// <summary>
    /// Aggregate run read (AquaBlend_Backend_Final_Integration_Implementation.md §15) — backs
    /// GET /api/runs/{runExternalId}. Returns run + scenario + input always; milpOutput/aiOutput
    /// are null until the corresponding worker has produced them, which is a valid response for
    /// a queued/in-progress run, not an error.
    /// </summary>
    public async Task<RunAggregateDto?> GetAggregateAsync(string runId)
    {
        var run = await _context.Runs.AsNoTracking()
            .Include(r => r.Scenario)
            .Include(r => r.MilpInput)
            .Include(r => r.MilpOutput)
            .Include(r => r.AiOutput)
            .FirstOrDefaultAsync(r => r.ExternalId == runId);

        if (run is null) return null;

        var runDto = await ToDtoAsync(run);

        var scenarioDto = run.Scenario is not null
            ? await _scenarioService.GetByExternalIdAsync(run.Scenario.ExternalId)
            : null;

        var inputDto = run.MilpInput is not null ? ToInputDto(run.MilpInput) : null;
        var milpOutputDto = await BuildMilpOutputDtoAsync(run);
        var aiOutputDto = run.AiOutput is not null ? ToAiOutputDto(run.AiOutput) : null;

        return new RunAggregateDto
        {
            Run = runDto,
            Scenario = scenarioDto,
            Input = inputDto,
            MilpOutput = milpOutputDto,
            AiOutput = aiOutputDto,
        };
    }

    /// <summary>
    /// Legacy compatibility path (AquaBlend_Backend_Final_Integration_Implementation.md §18):
    /// public.OptimisationResults remains the only result store for runs created before the
    /// milp_model_output integration (e.g. seeded RUN-1001). It is never written to for new
    /// architecture runs, and is only ever consulted here as a read fallback when a run has no
    /// MilpOutputId.
    /// </summary>
    public async Task<string> GetResultJsonAsync(string runId)
    {
        var run = await _context.Runs.AsNoTracking()
            .Include(r => r.OptimisationResults)
            .FirstOrDefaultAsync(r => r.ExternalId == runId);

        if (run is null)
            throw new NotFoundApiException($"Run \"{runId}\" was not found.");

        if (run.WorkflowStatus == RunWorkflowStatuses.Failed)
            throw new ConflictApiException("OPTIMISATION_FAILED", run.ErrorMessage ?? "The solver failed to produce a result for this run.");

        var result = run.OptimisationResults.FirstOrDefault();
        if (result is null)
            throw new ConflictApiException("OPTIMISATION_FAILED", "The result was requested before the run reached a terminal state.");

        return result.ResultJson;
    }

    private async Task<RunDto> ToDtoAsync(Run run)
    {
        var form = run.Scenario is not null
            ? await _jsonAdapter.ToFormStateAsync(run.Scenario)
            : null;

        // ReusedMilpFromRunId/ReusedAiFromRunId are internal Run.Id ints — resolved to the
        // referenced run's public ExternalId so clients never see a raw internal ID
        // (AquaBlend_Backend_Final_Integration_Implementation.md §16).
        string? reusedMilpExternalId = run.ReusedMilpFromRunId is int milpRunId
            ? await _context.Runs.AsNoTracking().Where(r => r.Id == milpRunId).Select(r => r.ExternalId).FirstOrDefaultAsync()
            : null;

        string? reusedAiExternalId = run.ReusedAiFromRunId is int aiRunId
            ? await _context.Runs.AsNoTracking().Where(r => r.Id == aiRunId).Select(r => r.ExternalId).FirstOrDefaultAsync()
            : null;

        return new RunDto
        {
            RunId = run.ExternalId,
            ScenarioId = run.Scenario?.ExternalId ?? string.Empty,
            ScenarioName = form?.ScenarioName,
            Status = run.WorkflowStatus,
            SolverOutcome = run.SolverOutcome,
            ProgressMessage = run.ProgressMessage,
            CreatedAt = run.CreatedAt,
            SolveTimeMs = run.SolveTimeMs,
            ObjectiveValue = run.ObjectiveValue,
            Error = run.WorkflowStatus == RunWorkflowStatuses.Failed ? run.ErrorMessage : null,
            ForceRerun = run.ForceRerun,
            MilpCacheHit = run.MilpCacheHit,
            AiCacheHit = run.AiCacheHit,
            MilpInputId = run.MilpInputId?.ToString(),
            MilpOutputId = run.MilpOutputId?.ToString(),
            AiOutputId = run.AiOutputId?.ToString(),
            ReusedMilpFromRunId = reusedMilpExternalId,
            ReusedAiFromRunId = reusedAiExternalId,
            MilpStartedAt = run.MilpStartedAt,
            MilpCompletedAt = run.MilpCompletedAt,
            AiStartedAt = run.AiStartedAt,
            AiCompletedAt = run.AiCompletedAt,
        };
    }

    private static MilpModelInputDto ToInputDto(MilpModelInput input) => new()
    {
        Id = input.Id.ToString(),
        InputStatus = input.InputStatus,
        InputContractVersion = input.InputContractVersion,
        MilpModelVersion = input.MilpModelVersion,
        ScenarioName = input.ScenarioName,
        ScenarioStatus = input.ScenarioStatus,
        DataSourceType = input.DataSourceType,
        DataSourceView = input.DataSourceView,
        AllowEstimatedValues = input.AllowEstimatedValues,
        FailIfSourceMissingFromDatabase = input.FailIfSourceMissingFromDatabase,
        FailIfDailyAvailabilityMissing = input.FailIfDailyAvailabilityMissing,
        FailIfRequiredQualityValueMissing = input.FailIfRequiredQualityValueMissing,
        FailIfDemandMissing = input.FailIfDemandMissing,
        Sources = ParseJson(input.Sources),
        Plants = ParseJson(input.Plants),
        DemandZones = ParseJson(input.DemandZones),
        SourceToPlantLinks = ParseJson(input.SourceToPlantLinks),
        PlantToZoneLinks = ParseJson(input.PlantToZoneLinks),
        QualityLimits = ParseJson(input.QualityLimits),
        ValidationPolicy = ParseJson(input.ValidationPolicy),
        FrontendInputJson = ParseJson(input.FrontendInputJson),
        CanonicalInputJson = ParseJson(input.CanonicalInputJson),
        SourceDataSnapshotJson = ParseJson(input.SourceDataSnapshotJson),
        ScenarioDataJson = ParseJsonNullable(input.ScenarioDataJson),
        ModelParametersJson = ParseJsonNullable(input.ModelParametersJson),
        SolverConfigJson = ParseJson(input.SolverConfigJson),
        CanonicalInputHash = input.CanonicalInputHash,
        ScenarioDataHash = input.ScenarioDataHash,
        ModelParametersHash = input.ModelParametersHash,
        InputHash = input.InputHash,
        SolverConfigHash = input.SolverConfigHash,
        ExecutionKey = input.ExecutionKey,
        ScenarioDataSchemaVersion = input.ScenarioDataSchemaVersion,
        ModelParametersSchemaVersion = input.ModelParametersSchemaVersion,
        CreatedAt = input.CreatedAt,
        ResolvedAt = input.ResolvedAt,
    };

    private async Task<MilpModelOutputDto?> BuildMilpOutputDtoAsync(Run run)
    {
        if (run.MilpOutput is not null)
        {
            return ToOutputDto(run.MilpOutput);
        }

        // Legacy compatibility path — see GetResultJsonAsync's doc comment above.
        var legacy = await _context.OptimisationResults.AsNoTracking()
            .FirstOrDefaultAsync(r => r.RunId == run.Id);

        if (legacy is null) return null;

        return new MilpModelOutputDto
        {
            Id = string.Empty,
            IsLegacyFallback = true,
            ScenarioExternalId = run.Scenario?.ExternalId,
            SolverStatus = legacy.Status,
            SolverIsFeasible = legacy.Status is "OPTIMAL" or "FEASIBLE",
            SolverIsOptimal = legacy.Status == "OPTIMAL",
            SolverObjectiveValue = legacy.TotalCost.HasValue ? (double)legacy.TotalCost.Value : null,
            TotalCost = legacy.TotalCost.HasValue ? (double)legacy.TotalCost.Value : null,
            SolveTimeMs = run.SolveTimeMs,
            RawOutputJson = ParseJson(legacy.ResultJson),
            CreatedAt = legacy.ReceivedAt,
            CompletedAt = legacy.SolvedAt,
            CacheReusable = false,
            ForcedRecompute = false,
        };
    }

    private static MilpModelOutputDto ToOutputDto(MilpModelOutput o) => new()
    {
        Id = o.Id.ToString(),
        IsLegacyFallback = false,
        SchemaVersion = o.SchemaVersion,
        ScenarioExternalId = o.ScenarioExternalId,
        ScenarioStatus = o.ScenarioStatus,
        ExecutionKey = o.ExecutionKey,
        InputHash = o.InputHash,
        ModelParametersHash = o.ModelParametersHash,
        MilpModelVersion = o.MilpModelVersion,
        SolverName = o.SolverName,
        SolverVersion = o.SolverVersion,
        SolverConfigHash = o.SolverConfigHash,
        SolverTerminationCondition = o.SolverTerminationCondition,
        SolverMessage = o.SolverMessage,
        SolveTimeMs = o.SolveTimeMs,
        RawOutputJson = ParseJson(o.RawOutputJson),
        OutputHash = o.OutputHash,
        CacheReusable = o.CacheReusable,
        ForcedRecompute = o.ForcedRecompute,
        StartedAt = o.StartedAt,
        CompletedAt = o.CompletedAt,
        UpdatedAt = o.UpdatedAt,
        CreatedAt = o.CreatedAt,
        LoaderStatus = o.LoaderStatus,
        LoaderScenarioReady = o.LoaderScenarioReady,
        LoaderValidationIssues = ParseJsonNullable(o.LoaderValidationIssues),
        LoaderChecks = ParseJsonNullable(o.LoaderChecks),
        PreprocessingStatus = o.PreprocessingStatus,
        PreprocessingWarnings = ParseJsonNullable(o.PreprocessingWarnings),
        PreprocessingChecks = ParseJsonNullable(o.PreprocessingChecks),
        OutputConsistencyStatus = o.OutputConsistencyStatus,
        OutputConsistencyTolerance = o.OutputConsistencyTolerance,
        OutputConsistencyChecks = ParseJsonNullable(o.OutputConsistencyChecks),
        SolverStatus = o.SolverStatus,
        SolverIsFeasible = o.SolverIsFeasible,
        SolverIsOptimal = o.SolverIsOptimal,
        SolverObjectiveValue = o.SolverObjectiveValue,
        TotalDemandMlPerDay = o.TotalDemandMlPerDay,
        TotalWithdrawalMlPerDay = o.TotalWithdrawalMlPerDay,
        TotalTreatedMlPerDay = o.TotalTreatedMlPerDay,
        TotalDeliveredMlPerDay = o.TotalDeliveredMlPerDay,
        SelectedSourceCount = o.SelectedSourceCount,
        ActivePlantCount = o.ActivePlantCount,
        TotalSourceFixedCost = o.TotalSourceFixedCost,
        TotalSourceVariableCost = o.TotalSourceVariableCost,
        TotalPlantFixedCost = o.TotalPlantFixedCost,
        TotalPlantVariableCost = o.TotalPlantVariableCost,
        ReconstructedTotalCost = o.ReconstructedTotalCost,
        TotalCost = o.TotalCost,
        CostReconciles = o.CostReconciles,
        Sources = ParseJsonNullable(o.Sources),
        Plants = ParseJsonNullable(o.Plants),
        DemandZones = ParseJsonNullable(o.DemandZones),
        FlowsSourceToPlant = ParseJsonNullable(o.FlowsSourceToPlant),
        FlowsPlantToZone = ParseJsonNullable(o.FlowsPlantToZone),
        Quality = ParseJsonNullable(o.Quality),
        BindingConstraintsSummary = ParseJsonNullable(o.BindingConstraintsSummary),
        Warnings = ParseJsonNullable(o.Warnings),
    };

    private static MilpAiOutputDto ToAiOutputDto(MilpAiOutput a) => new()
    {
        Id = a.Id.ToString(),
        Status = a.Status,
        AiProvider = a.AiProvider,
        AiModel = a.AiModel,
        AiModelVersion = a.AiModelVersion,
        PromptVersion = a.PromptVersion,
        AnalysisVersion = a.AnalysisVersion,
        AiContractVersion = a.AiContractVersion,
        MilpOutputHash = a.MilpOutputHash,
        AiCacheKey = a.AiCacheKey,
        AiInputJson = ParseJson(a.AiInputJson),
        ExecutiveSummary = a.ExecutiveSummary,
        DecisionExplanation = a.DecisionExplanation,
        KeyFindings = ParseJsonNullable(a.KeyFindings),
        Anomalies = ParseJsonNullable(a.Anomalies),
        Recommendations = ParseJsonNullable(a.Recommendations),
        Warnings = ParseJsonNullable(a.Warnings),
        RiskAssessment = ParseJsonNullable(a.RiskAssessment),
        SourceAnalysis = ParseJsonNullable(a.SourceAnalysis),
        PlantAnalysis = ParseJsonNullable(a.PlantAnalysis),
        QualityAnalysis = ParseJsonNullable(a.QualityAnalysis),
        Limitations = ParseJsonNullable(a.Limitations),
        RawAiJson = ParseJsonNullable(a.RawAiJson),
        AiOutputHash = a.AiOutputHash,
        CacheReusable = a.CacheReusable,
        ForcedRecompute = a.ForcedRecompute,
        LatencyMs = a.LatencyMs,
        PromptTokens = a.PromptTokens,
        CompletionTokens = a.CompletionTokens,
        TotalTokens = a.TotalTokens,
        ErrorCode = a.ErrorCode,
        ErrorMessage = a.ErrorMessage,
        CreatedAt = a.CreatedAt,
        StartedAt = a.StartedAt,
        CompletedAt = a.CompletedAt,
        UpdatedAt = a.UpdatedAt,
    };

    // JsonDocument is intentionally not disposed: its RootElement must outlive this call and be
    // embedded directly into the response DTO. The only cost of skipping Dispose() here is that
    // the document's pooled backing buffer is reclaimed by the GC instead of returned to the
    // pool immediately — there is no correctness impact.
    private static JsonElement ParseJson(string json) =>
        JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "null" : json).RootElement;

    private static JsonElement? ParseJsonNullable(string? json) =>
        json is null ? null : ParseJson(json);
}
