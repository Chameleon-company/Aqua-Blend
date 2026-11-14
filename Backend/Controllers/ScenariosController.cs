using AquaBlend.DTOs.Runs;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AquaBlend.Controllers
{
    [ApiController]
    [Route("api/scenarios")]
    public class ScenariosController : ControllerBase
    {
        private readonly ScenarioService _scenarioService;
        private readonly RunService _runService;

        public ScenariosController(ScenarioService scenarioService, RunService runService)
        {
            _scenarioService = scenarioService;
            _runService = runService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ScenarioSummaryDto>>> GetAll()
        {
            return Ok(await _scenarioService.GetAllAsync());
        }

        [HttpGet("{scenarioId}")]
        public async Task<ActionResult<ScenarioDetailDto>> GetById(string scenarioId)
        {
            var scenario = await _scenarioService.GetByExternalIdAsync(scenarioId);

            if (scenario == null)
                return NotFound();

            return Ok(scenario);
        }

        [HttpPost]
        public async Task<ActionResult<ScenarioDetailDto>> Create(ScenarioFormStateDto dto)
        {
            var created = await _scenarioService.CreateAsync(dto);

            return CreatedAtAction(
                nameof(GetById),
                new { scenarioId = created.ScenarioId },
                created);
        }

        [HttpPut("{scenarioId}")]
        public async Task<ActionResult<ScenarioDetailDto>> Update(string scenarioId, ScenarioFormStateDto dto)
        {
            var updated = await _scenarioService.UpdateAsync(scenarioId, dto);

            if (updated is null)
                return NotFound();

            return Ok(updated);
        }

        [HttpDelete("{scenarioId}")]
        public async Task<IActionResult> Delete(string scenarioId)
        {
            var deleted = await _scenarioService.DeleteAsync(scenarioId);

            if (!deleted)
                return NotFound();

            return NoContent();
        }

        [HttpPost("{scenarioId}/validate")]
        public async Task<ActionResult<ValidationResultDto>> Validate(string scenarioId)
        {
            var result = await _scenarioService.ValidateAsync(scenarioId);

            if (result is null)
                return NotFound();

            return Ok(result);
        }

        [HttpPost("{scenarioId}/runs")]
        public async Task<ActionResult<CreateRunResponseDto>> CreateRun(string scenarioId, CreateRunRequestDto? request)
        {
            var response = await _runService.CreateRunAsync(scenarioId, request?.ForceRerun ?? false);
            return Accepted(response);
        }

        [HttpGet("{scenarioId}/runs")]
        public async Task<ActionResult<IEnumerable<RunSummaryDto>>> GetRuns(string scenarioId)
        {
            return Ok(await _runService.GetScenarioRunsAsync(scenarioId));
        }
    }
}
