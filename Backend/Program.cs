using AquaBlend.Api.Authorization;
using AquaBlend.Data;
using AquaBlend.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddScoped<AquaBlend.Services.ScenarioService>();
builder.Services.AddScoped<AquaBlend.Services.CanonicalScenarioBuilder>();
builder.Services.AddScoped<AquaBlend.Services.ScenarioJsonAdapter>();
builder.Services.AddScoped<AquaBlend.Services.WaterSourceService>();
builder.Services.AddScoped<AquaBlend.Services.ReferenceDataService>();
builder.Services.AddScoped<AquaBlend.Services.MilpInputSnapshotService>();
builder.Services.AddScoped<AquaBlend.Services.RunService>();
builder.Services.AddScoped<AquaBlend.Services.OptimisationResultIngestService>();

// Frontend origin(s) allowed to call this API from a browser — configured via
// Cors:AllowedOrigins (appsettings.json / appsettings.Development.json), not hardcoded, so prod
// and local dev can differ without a code change.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var useInMemoryDatabase = builder.Environment.IsEnvironment("Testing");
var inMemoryDatabaseName =
    builder.Configuration.GetValue<string>("InMemoryDatabaseName")
    ?? "AquaBlendTestDb";

builder.Services.AddDbContext<AquaBlendDbContext>(options =>
{
    if (useInMemoryDatabase)
    {
        options.UseInMemoryDatabase(inMemoryDatabaseName);
    }
    else
    {
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"));
    }
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        AppPolicies.CanView,
        policy => policy.RequireRole(
            AppRoles.Admin,
            AppRoles.Analyst,
            AppRoles.Viewer));

    options.AddPolicy(
        AppPolicies.CanAnalyse,
        policy => policy.RequireRole(
            AppRoles.Admin,
            AppRoles.Analyst));

    options.AddPolicy(
        AppPolicies.CanAdminister,
        policy => policy.RequireRole(AppRoles.Admin));
});

var app = builder.Build();

// Apply migrations and seed data on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider
        .GetRequiredService<AquaBlendDbContext>();

    if (db.Database.IsRelational())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }

    SeedData.Initialize(db);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

// AquaBlend health-check endpoint.
app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "healthy",
        service = "AquaBlend.Api",
        timestamp = DateTime.UtcNow
    });
})
.WithName("GetHealth");

app.MapControllers();

app.Run();

public partial class Program { }
