using AquaBlend.Data;
using AquaBlend.DTOs.Scenarios;
using AquaBlend.Entities;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services
{
    public class ScenarioService
    {
        private readonly AquaBlendDbContext _context;

        public ScenarioService(AquaBlendDbContext context)
        {
            _context = context;
        }

        public async Task<List<ScenarioResponseDto>> GetAllAsync()
        {
            return await _context.Scenarios
                .Select(s => new ScenarioResponseDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt
                })
                .ToListAsync();
        }

        public async Task<ScenarioResponseDto?> GetByIdAsync(int id)
        {
            var scenario = await _context.Scenarios.FindAsync(id);

            if (scenario == null)
                return null;

            return new ScenarioResponseDto
            {
                Id = scenario.Id,
                Name = scenario.Name,
                Description = scenario.Description,
                CreatedAt = scenario.CreatedAt,
                UpdatedAt = scenario.UpdatedAt
            };
        }

        public async Task<ScenarioResponseDto> CreateAsync(CreateScenarioDto dto)
        {
            var scenario = new Scenario
            {
                Name = dto.Name,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            _context.Scenarios.Add(scenario);
            await _context.SaveChangesAsync();

            return new ScenarioResponseDto
            {
                Id = scenario.Id,
                Name = scenario.Name,
                Description = scenario.Description,
                CreatedAt = scenario.CreatedAt,
                UpdatedAt = scenario.UpdatedAt
            };
        }

        public async Task<bool> UpdateAsync(int id, UpdateScenarioDto dto)
        {
            var scenario = await _context.Scenarios.FindAsync(id);

            if (scenario == null)
                return false;

            scenario.Name = dto.Name;
            scenario.Description = dto.Description;
            scenario.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var scenario = await _context.Scenarios.FindAsync(id);

            if (scenario == null)
                return false;

            _context.Scenarios.Remove(scenario);
            await _context.SaveChangesAsync();

            return true;
        }
    }
}