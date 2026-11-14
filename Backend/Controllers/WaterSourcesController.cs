using AquaBlend.DTOs.ReferenceData;
using AquaBlend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AquaBlend.Controllers;

// Route matches integration.md §36 (GET /api/sources) rather than the WaterSource entity name —
// the entity name stays close to the WaterSources DB table, the public API speaks "sources".
[ApiController]
[Route("api/sources")]
public class WaterSourcesController : ControllerBase
{
    private readonly WaterSourceService _waterSourceService;

    public WaterSourcesController(WaterSourceService waterSourceService)
    {
        _waterSourceService = waterSourceService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SourceRefDto>>> GetAll([FromQuery] SourceFiltersDto filters)
    {
        return Ok(await _waterSourceService.GetAllAsync(filters));
    }

    [HttpGet("{sourceId}")]
    public async Task<ActionResult<SourceRefDto>> GetById(string sourceId)
    {
        var source = await _waterSourceService.GetByExternalIdAsync(sourceId);
        return source is null ? NotFound() : Ok(source);
    }

    [HttpPost]
    public async Task<ActionResult<SourceRefDto>> Create(SourceWriteDto dto)
    {
        var created = await _waterSourceService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { sourceId = created.SourceId }, created);
    }

    [HttpPut("{sourceId}")]
    public async Task<IActionResult> Update(string sourceId, SourceWriteDto dto)
    {
        return await _waterSourceService.UpdateAsync(sourceId, dto) ? NoContent() : NotFound();
    }

    [HttpDelete("{sourceId}")]
    public async Task<IActionResult> Delete(string sourceId)
    {
        return await _waterSourceService.DeleteAsync(sourceId) ? NoContent() : NotFound();
    }
}
