using AquaBlend.DTOs.Runs;
using AquaBlend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AquaBlend.Controllers;

[ApiController]
[Route("api/optimisation-results")]
public class OptimisationResultsController : ControllerBase
{
    private readonly OptimisationResultIngestService _ingestService;

    public OptimisationResultsController(OptimisationResultIngestService ingestService)
    {
        _ingestService = ingestService;
    }

    [HttpPost]
    public async Task<IActionResult> Ingest(OptimisationResultIngestDto dto)
    {
        await _ingestService.IngestAsync(dto);
        return Accepted();
    }
}
