using AquaBlend.DTOs.Runs;
using AquaBlend.Exceptions;
using AquaBlend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AquaBlend.Controllers;

[ApiController]
[Route("api/runs")]
public class RunsController : ControllerBase
{
    private readonly RunService _runService;

    public RunsController(RunService runService)
    {
        _runService = runService;
    }

    // Aggregate read (AquaBlend_Backend_Final_Integration_Implementation.md §15/§21) — returns
    // run + scenario + input + milpOutput + aiOutput in one call rather than making the frontend
    // query milp_model_input/milp_model_output/milp_ai_output separately. milpOutput/aiOutput
    // are null while the run is still queued/in progress; that is a valid response, not an error.
    [HttpGet("{runId}")]
    public async Task<ActionResult<RunAggregateDto>> GetById(string runId)
    {
        var run = await _runService.GetAggregateAsync(runId);
        return run is null ? NotFound() : Ok(run);
    }

    [HttpGet("{runId}/results")]
    public async Task<IActionResult> GetResults(string runId)
    {
        var json = await _runService.GetResultJsonAsync(runId);
        return Content(json, "application/json");
    }

    // The AI, diagnostics, and stress-testing subsystems have no code yet (AI/ and the
    // feasibility/stress-testing workstream in integration.md §17-23 are unimplemented). These
    // routes exist so the API surface matches integration.md §38-39 and the frontend's
    // AquaBlendClient contract, but they honestly report "not implemented" rather than faking
    // a result — see todo.md for what unblocks them.

    [HttpGet("{runId}/ai-analysis")]
    public IActionResult GetAiAnalysis(string runId)
    {
        throw new NotImplementedApiException(
            "AI_ANALYSIS_NOT_IMPLEMENTED",
            "AI analysis is not implemented yet — the AI team has not delivered a callable service.");
    }

    [HttpGet("{runId}/diagnostics")]
    public IActionResult GetDiagnostics(string runId)
    {
        throw new NotImplementedApiException(
            "DIAGNOSTICS_NOT_IMPLEMENTED",
            "Infeasibility diagnostics are not implemented yet.");
    }

    [HttpPost("{runId}/stress-tests")]
    public IActionResult CreateStressTest(string runId)
    {
        throw new NotImplementedApiException(
            "STRESS_TESTING_NOT_IMPLEMENTED",
            "Stress testing is not implemented yet — it depends on the MILP integration.");
    }

    [HttpGet("{runId}/stress-tests")]
    public IActionResult GetStressTests(string runId)
    {
        throw new NotImplementedApiException(
            "STRESS_TESTING_NOT_IMPLEMENTED",
            "Stress testing is not implemented yet — it depends on the MILP integration.");
    }
}

[ApiController]
[Route("api/stress-tests")]
public class StressTestsController : ControllerBase
{
    [HttpGet("{stressTestId}")]
    public IActionResult GetById(string stressTestId)
    {
        throw new NotImplementedApiException(
            "STRESS_TESTING_NOT_IMPLEMENTED",
            "Stress testing is not implemented yet — it depends on the MILP integration.");
    }
}
