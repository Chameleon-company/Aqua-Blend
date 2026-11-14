using System.Text.Json;

namespace AquaBlend.DTOs.Common;

/// <summary>
/// snake_case JSON policy for the canonical MILP scenario contract
/// (Contracts/Milp/CanonicalMilpScenario.cs) — separate from JsonDefaults' camelCase policy,
/// which remains the HTTP/legacy-form-state policy. PropertyNamingPolicy does not affect
/// Dictionary&lt;string, T&gt; keys, so MilpQualityLimits.Parameters keys ("pH", "alkalinity", ...)
/// are written verbatim. Deliberately does NOT ignore nulls/defaults globally — the contract
/// requires explicit "enabled": false, "forced_inactive": false and null overrides to be visible
/// in the persisted document, not silently dropped; individual optional fields (e.g.
/// MilpQualityParameter.ModelName) opt out of that with [JsonIgnore] instead.
/// </summary>
public static class MilpJsonDefaults
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = false,
    };
}
