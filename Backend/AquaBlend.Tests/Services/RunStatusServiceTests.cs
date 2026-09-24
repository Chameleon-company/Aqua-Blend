using AquaBlend.Services;

namespace AquaBlend.Tests.Services;

public sealed class RunStatusServiceTests
{
    private readonly RunStatusService _service = new();

    [Theory]
    [InlineData("draft", "ready", RunStatusActor.Backend)]
    [InlineData("ready", "draft", RunStatusActor.Backend)]
    [InlineData("ready", "queued", RunStatusActor.Client)]
    [InlineData("queued", "ready", RunStatusActor.Client)]
    [InlineData("queued", "solving", RunStatusActor.AiTeam)]
    [InlineData("solving", "queued", RunStatusActor.AiTeam)]
    [InlineData("solving", "solved", RunStatusActor.AiTeam)]
    [InlineData("solved", "analysing", RunStatusActor.Backend)]
    [InlineData("analysing", "completed", RunStatusActor.Backend)]
    public void IsValidTransition_AllowedActorAndTransition_ReturnsTrue(
        string currentStatus,
        string nextStatus,
        RunStatusActor actor)
    {
        Assert.True(
            _service.IsValidTransition(currentStatus, nextStatus, actor));
    }

    [Theory]
    [InlineData("ready", "solving", RunStatusActor.Client)]
    [InlineData("solved", "completed", RunStatusActor.Backend)]
    [InlineData("draft", "queued", RunStatusActor.Client)]
    [InlineData("queued", "solved", RunStatusActor.AiTeam)]
    public void IsValidTransition_SkippedState_ReturnsFalse(
        string currentStatus,
        string nextStatus,
        RunStatusActor actor)
    {
        Assert.False(
            _service.IsValidTransition(currentStatus, nextStatus, actor));
    }

    [Theory]
    [InlineData("queued", "solving", RunStatusActor.Client)]
    [InlineData("solving", "solved", RunStatusActor.Client)]
    [InlineData("analysing", "completed", RunStatusActor.Client)]
    [InlineData("ready", "queued", RunStatusActor.Backend)]
    public void IsValidTransition_WrongActor_ReturnsFalse(
        string currentStatus,
        string nextStatus,
        RunStatusActor actor)
    {
        Assert.False(
            _service.IsValidTransition(currentStatus, nextStatus, actor));
    }

    [Theory]
    [InlineData("queued", RunStatusActor.AiTeam)]
    [InlineData("queued", RunStatusActor.Backend)]
    [InlineData("solving", RunStatusActor.AiTeam)]
    [InlineData("solving", RunStatusActor.Backend)]
    [InlineData("solved", RunStatusActor.Backend)]
    [InlineData("analysing", RunStatusActor.Backend)]
    public void IsValidTransition_AllowedFailureActor_ReturnsTrue(
        string currentStatus,
        RunStatusActor actor)
    {
        Assert.True(
            _service.IsValidTransition(
                currentStatus,
                "failed",
                actor));
    }

    [Theory]
    [InlineData("draft")]
    [InlineData("ready")]
    [InlineData("queued")]
    [InlineData("solving")]
    [InlineData("solved")]
    [InlineData("analysing")]
    public void IsValidTransition_ClientCannotDeclareFailure_ReturnsFalse(
        string currentStatus)
    {
        Assert.False(
            _service.IsValidTransition(
                currentStatus,
                "failed",
                RunStatusActor.Client));
    }

    [Theory]
    [InlineData("solved")]
    [InlineData("analysing")]
    public void IsValidTransition_AiTeamCannotFailBackendOwnedState_ReturnsFalse(
        string currentStatus)
    {
        Assert.False(
            _service.IsValidTransition(
                currentStatus,
                "failed",
                RunStatusActor.AiTeam));
    }

    [Theory]
    [InlineData("draft", RunStatusActor.Client)]
    [InlineData("ready", RunStatusActor.Backend)]
    [InlineData("queued", RunStatusActor.AiTeam)]
    [InlineData("solving", RunStatusActor.AiTeam)]
    [InlineData("solved", RunStatusActor.Backend)]
    [InlineData("analysing", RunStatusActor.Backend)]
    [InlineData("completed", RunStatusActor.Client)]
    [InlineData("failed", RunStatusActor.AiTeam)]
    public void IsValidTransition_SameState_ReturnsTrue(
        string status,
        RunStatusActor actor)
    {
        Assert.True(
            _service.IsValidTransition(
                status,
                status,
                actor));
    }

    [Theory]
    [InlineData("completed", "draft")]
    [InlineData("completed", "ready")]
    [InlineData("failed", "queued")]
    [InlineData("failed", "solving")]
    public void IsValidTransition_FromTerminalState_ReturnsFalse(
        string currentStatus,
        string nextStatus)
    {
        Assert.False(
            _service.IsValidTransition(
                currentStatus,
                nextStatus,
                RunStatusActor.Backend));
    }

    [Fact]
    public void GetWorkflowStatuses_IncludesFailed()
    {
        var statuses = _service.GetWorkflowStatuses();

        Assert.Contains("failed", statuses);
        Assert.Contains("completed", statuses);
        Assert.Equal(8, statuses.Count);
    }
}