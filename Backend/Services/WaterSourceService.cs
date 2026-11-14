using AquaBlend.Data;
using AquaBlend.DTOs.ReferenceData;
using AquaBlend.Entities;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Services;

public class WaterSourceService
{
    private readonly AquaBlendDbContext _context;

    public WaterSourceService(AquaBlendDbContext context)
    {
        _context = context;
    }

    public async Task<List<SourceRefDto>> GetAllAsync(SourceFiltersDto? filters = null)
    {
        var query = _context.WaterSources.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filters?.SourceType))
            query = query.Where(s => s.SourceType == filters.SourceType);

        if (!string.IsNullOrWhiteSpace(filters?.Availability))
            query = query.Where(s => s.AvailabilityStatus == filters.Availability);

        if (filters?.ModelReady is { } modelReady)
            query = query.Where(s => s.ModelReady == modelReady);

        if (filters?.EstimatedOrMeasured is "estimated")
            query = query.Where(s => s.IsEstimated);
        else if (filters?.EstimatedOrMeasured is "measured")
            query = query.Where(s => !s.IsEstimated);

        var sources = await query.OrderBy(s => s.Name).ToListAsync();
        return sources.Select(ToDto).ToList();
    }

    public async Task<SourceRefDto?> GetByExternalIdAsync(string sourceId)
    {
        var source = await _context.WaterSources
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ExternalId == sourceId);

        return source is null ? null : ToDto(source);
    }

    public async Task<SourceRefDto> CreateAsync(SourceWriteDto dto)
    {
        var source = new WaterSource
        {
            Name = dto.Name.Trim(),
            SourceType = dto.SourceType.Trim(),
            AvailabilityStatus = dto.AvailabilityStatus.Trim(),
            ModelReady = dto.ModelReady,
            DefaultMinWithdrawalMlPerDay = dto.DefaultMinWithdrawalMlPerDay,
            DefaultMaxWithdrawalMlPerDay = dto.DefaultMaxWithdrawalMlPerDay,
            CostPerMl = dto.CostPerMl,
            QualityPH = dto.Quality?.PH,
            QualityAlkalinityMgPerLCaCO3 = dto.Quality?.AlkalinityMgPerLCaCO3,
            QualityTurbidityNtu = dto.Quality?.TurbidityNtu,
            IsEstimated = dto.IsEstimated,
            Provenance = dto.Provenance,
        };

        _context.WaterSources.Add(source);
        await _context.SaveChangesAsync();

        source.ExternalId = $"SRC_{source.Id:D3}";
        await _context.SaveChangesAsync();

        return ToDto(source);
    }

    public async Task<bool> UpdateAsync(string sourceId, SourceWriteDto dto)
    {
        var source = await _context.WaterSources.FirstOrDefaultAsync(s => s.ExternalId == sourceId);
        if (source is null) return false;

        source.Name = dto.Name.Trim();
        source.SourceType = dto.SourceType.Trim();
        source.AvailabilityStatus = dto.AvailabilityStatus.Trim();
        source.ModelReady = dto.ModelReady;
        source.DefaultMinWithdrawalMlPerDay = dto.DefaultMinWithdrawalMlPerDay;
        source.DefaultMaxWithdrawalMlPerDay = dto.DefaultMaxWithdrawalMlPerDay;
        source.CostPerMl = dto.CostPerMl;
        source.QualityPH = dto.Quality?.PH;
        source.QualityAlkalinityMgPerLCaCO3 = dto.Quality?.AlkalinityMgPerLCaCO3;
        source.QualityTurbidityNtu = dto.Quality?.TurbidityNtu;
        source.IsEstimated = dto.IsEstimated;
        source.Provenance = dto.Provenance;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(string sourceId)
    {
        var source = await _context.WaterSources.FirstOrDefaultAsync(s => s.ExternalId == sourceId);
        if (source is null) return false;

        _context.WaterSources.Remove(source);
        await _context.SaveChangesAsync();
        return true;
    }

    private static SourceRefDto ToDto(WaterSource source) => new()
    {
        SourceId = source.ExternalId,
        Name = source.Name,
        SourceType = source.SourceType,
        AvailabilityStatus = source.AvailabilityStatus,
        ModelReady = source.ModelReady,
        DefaultMinWithdrawalMlPerDay = source.DefaultMinWithdrawalMlPerDay,
        DefaultMaxWithdrawalMlPerDay = source.DefaultMaxWithdrawalMlPerDay,
        Cost = source.CostPerMl,
        Quality = new SourceQualityDto
        {
            PH = source.QualityPH,
            AlkalinityMgPerLCaCO3 = source.QualityAlkalinityMgPerLCaCO3,
            TurbidityNtu = source.QualityTurbidityNtu,
        },
        IsEstimated = source.IsEstimated,
        Provenance = source.Provenance,
    };
}
