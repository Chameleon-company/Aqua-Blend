using AquaBlend.Controllers;
using AquaBlend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AquaBlend.Tests.Controllers;

public sealed class ChangesControllerTests
{
    [Fact]
    public async Task GetChanges_InvalidTimestamp_ReturnsBadRequest()
    {
        var options = new DbContextOptionsBuilder<AquaBlendDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var context = new AquaBlendDbContext(options);

        var controller = new ChangesController(context);

        var result = await controller.GetChanges(
            "invalid-timestamp",
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}