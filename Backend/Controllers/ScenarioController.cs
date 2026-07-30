using AquaBlend.DTOs.Scenarios;
using AquaBlend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AquaBlend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScenariosController : ControllerBase
    {
        private readonly ScenarioService _scenarioService;

        public ScenariosController(ScenarioService scenarioService)
        {
            _scenarioService = scenarioService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ScenarioResponseDto>>> GetAll()
        {
            var scenarios = await _scenarioService.GetAllAsync();
            return Ok(scenarios);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ScenarioResponseDto>> GetById(int id)
        {
            var scenario = await _scenarioService.GetByIdAsync(id);

            if (scenario == null)
                return NotFound();

            return Ok(scenario);
        }

        [HttpPost]
        public async Task<ActionResult<ScenarioResponseDto>> Create(CreateScenarioDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var created = await _scenarioService.CreateAsync(dto);

            return CreatedAtAction(
                nameof(GetById),
                new { id = created.Id },
                created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateScenarioDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updated = await _scenarioService.UpdateAsync(id, dto);

            if (!updated)
                return NotFound();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _scenarioService.DeleteAsync(id);

            if (!deleted)
                return NotFound();

            return NoContent();
        }
    }
}