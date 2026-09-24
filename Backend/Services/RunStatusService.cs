namespace AquaBlend.Services;

public enum RunStatusActor
{
    Backend,
    Client,
    AiTeam
}

public sealed class RunStatusService
{
    private static readonly HashSet<string> WorkflowStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "draft",
            "ready",
            "queued",
            "solving",
            "solved",
            "analysing",
            "completed",
            "failed"
        };

    private static readonly Dictionary<
        (string From, string To),
        HashSet<RunStatusActor>> AllowedTransitions = new()
        {
            [("draft", "ready")] =
                new() { RunStatusActor.Backend },

            [("ready", "draft")] =
                new() { RunStatusActor.Backend },

            [("ready", "queued")] =
                new() { RunStatusActor.Client },

            [("queued", "ready")] =
                new() { RunStatusActor.Client },

            [("queued", "solving")] =
                new() { RunStatusActor.AiTeam },

            [("solving", "queued")] =
                new() { RunStatusActor.AiTeam },

            [("solving", "solved")] =
                new() { RunStatusActor.AiTeam },

            [("solved", "analysing")] =
                new() { RunStatusActor.Backend },

            [("analysing", "completed")] =
                new() { RunStatusActor.Backend },

            // AI team can report failure while it owns the work.
            // Backend can also fail these states when handling a timeout.
            [("queued", "failed")] =
                new()
                {
                    RunStatusActor.AiTeam,
                    RunStatusActor.Backend
                },

            [("solving", "failed")] =
                new()
                {
                    RunStatusActor.AiTeam,
                    RunStatusActor.Backend
                },

            // Once a result has arrived, failure ownership belongs
            // to the backend.
            [("solved", "failed")] =
                new() { RunStatusActor.Backend },

            [("analysing", "failed")] =
                new() { RunStatusActor.Backend }
        };

    public bool IsValidTransition(
        string currentStatus,
        string nextStatus,
        RunStatusActor actor)
    {
        if (string.IsNullOrWhiteSpace(currentStatus) ||
            string.IsNullOrWhiteSpace(nextStatus))
        {
            return false;
        }

        var current = currentStatus.Trim().ToLowerInvariant();
        var next = nextStatus.Trim().ToLowerInvariant();

        if (!WorkflowStatuses.Contains(current) ||
            !WorkflowStatuses.Contains(next))
        {
            return false;
        }

        // Same-state transitions are successful no-ops.
        // This allows safe retries.
        if (current == next)
        {
            return true;
        }

        // completed and failed are terminal states.
        if (current is "completed" or "failed")
        {
            return false;
        }

        return AllowedTransitions.TryGetValue(
                   (current, next),
                   out var allowedActors)
               && allowedActors.Contains(actor);
    }

    public IReadOnlyList<string> GetWorkflowStatuses()
    {
        return new[]
        {
            "draft",
            "ready",
            "queued",
            "solving",
            "solved",
            "analysing",
            "completed",
            "failed"
        };
    }
}