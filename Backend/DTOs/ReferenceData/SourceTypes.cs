namespace AquaBlend.DTOs.ReferenceData;

// Controlled vocabulary for WaterSource.Type, aligned with the source_type
// values already used in the MILP model output contract (model_output_contract.json,
// sources.selected[].source_type / sources.unused[].source_type). Proposed for
// team agreement rather than enforced yet - existing seeded rows use "Surface" and
// "Groundwater" with different casing, so this isn't a hard validation rule here,
// just the reference list callers should expect GET /api/sources to converge on.
public static class SourceTypes
{
    public const string Reservoir = "reservoir";
    public const string River = "river";
    public const string Groundwater = "groundwater";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Reservoir,
        River,
        Groundwater
    };
}
