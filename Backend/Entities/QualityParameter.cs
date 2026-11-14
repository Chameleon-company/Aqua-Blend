namespace AquaBlend.Entities;

public class QualityParameter
{
    public int Id { get; set; }

    public int QualityProfileId { get; set; }
    public QualityProfile QualityProfile { get; set; } = null!;

    public string ParameterId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public double? LowerLimit { get; set; }
    public double? UpperLimit { get; set; }

    // How the MILP loader interprets this parameter (json_contracts/model_input_contract.json):
    // "identity" reads the source field as-is; "ph_to_hydrogen_ion" converts pH into a hydrogen-ion
    // concentration before the solver sees it, in which case ModelName/ModelUnit describe that
    // converted quantity. Domain-invariant per parameter type, not scenario-editable.
    public string Transform { get; set; } = "identity";
    public string? SourceField { get; set; }
    public string? ModelName { get; set; }
    public string? ModelUnit { get; set; }
}
