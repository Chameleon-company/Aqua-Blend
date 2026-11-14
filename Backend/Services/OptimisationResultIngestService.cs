using AquaBlend.Data;
using AquaBlend.DTOs.Runs;
using AquaBlend.Entities;
using AquaBlend.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services;

/// <summary>
/// Backs POST /api/optimisation-results — the endpoint an eventual real MILP service would call
/// once it exists (Backend/docs/database.md documents the original, run-less version of this
/// contract; this extends it with the run_id the Run entity introduces). Independent of whether
/// MILP itself exists yet: this is the passive ingestion side, not the orchestration call to it.
/// </summary>
public class OptimisationResultIngestService
{
    private readonly AquaBlendDbContext _context;

    public OptimisationResultIngestService(AquaBlendDbContext context)
    {
        _context = context;
    }

    public async Task IngestAsync(OptimisationResultIngestDto dto)
    {
        var run = await _context.Runs
            .Include(r => r.OptimisationResults)
            .FirstOrDefaultAsync(r => r.ExternalId == dto.RunId);

        if (run is null)
        {
            throw new NotFoundApiException(
                $"Run \"{dto.RunId}\" was not found. The run must already exist " +
                "(created via POST /api/scenarios/{scenarioId}/runs) before a result can be ingested for it.");
        }

        var scenario = await _context.Scenarios.FirstOrDefaultAsync(s => s.Id == run.ScenarioId);
        if (scenario is null || scenario.ExternalId != dto.ScenarioId)
        {
            throw new ConflictApiException(
                "SCENARIO_MISMATCH",
                $"Run \"{dto.RunId}\" does not belong to scenario \"{dto.ScenarioId}\".");
        }

        var existing = run.OptimisationResults.FirstOrDefault();
        if (existing is null)
        {
            existing = new OptimisationResult { ScenarioId = run.ScenarioId, RunId = run.Id };
            _context.OptimisationResults.Add(existing);
        }

        existing.Status = dto.Status;
        existing.SolvedAt = dto.SolvedAt ?? DateTime.UtcNow;
        existing.ReceivedAt = DateTime.UtcNow;
        existing.ContractVersion = dto.ContractVersion;
        existing.ResultJson = dto.Result.GetRawText();
        existing.TotalCost = dto.TotalCost;
        existing.Currency = dto.Currency;

        run.SolverOutcome = dto.Status switch
        {
            "OPTIMAL" or "FEASIBLE" => "optimal",
            "INFEASIBLE" => "infeasible",
            _ => null,
        };
        run.WorkflowStatus = run.SolverOutcome is not null ? "completed" : "failed";
        run.ObjectiveValue = dto.TotalCost;
        run.SolveTimeMs = dto.SolveTimeMs;

        if (run.SolverOutcome is null)
        {
            run.ErrorCode = "SOLVER_ERROR";
            run.ErrorMessage = $"The solver reported a non-recoverable status: {dto.Status}";
        }
        else
        {
            run.ErrorCode = null;
            run.ErrorMessage = null;
        }

        await _context.SaveChangesAsync();
    }
}
