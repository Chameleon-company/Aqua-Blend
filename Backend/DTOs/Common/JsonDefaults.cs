using System.Text.Json;

namespace AquaBlend.DTOs.Common;

/// <summary>
/// Single camelCase JSON policy shared by the HTTP layer (Program.cs AddJsonOptions)
/// and by services that hand-serialise a document into a jsonb column (Scenario.FormStateJson,
/// Scenario.ValidationIssuesJson). Keeping one instance means a scenario's stored JSON uses the
/// exact same casing as the API response built from it.
/// </summary>
public static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
}
