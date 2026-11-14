using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AquaBlend.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExpandDomainModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Scenarios");

            migrationBuilder.RenameColumn(
                name: "Type",
                table: "WaterSources",
                newName: "SourceType");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Scenarios",
                newName: "Status");

            migrationBuilder.AddColumn<string>(
                name: "AvailabilityStatus",
                table: "WaterSources",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "CostPerMl",
                table: "WaterSources",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DefaultMaxWithdrawalMlPerDay",
                table: "WaterSources",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DefaultMinWithdrawalMlPerDay",
                table: "WaterSources",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "WaterSources",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsEstimated",
                table: "WaterSources",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ModelReady",
                table: "WaterSources",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Provenance",
                table: "WaterSources",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "QualityAlkalinityMgPerLCaCO3",
                table: "WaterSources",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "QualityPH",
                table: "WaterSources",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "QualityTurbidityNtu",
                table: "WaterSources",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FormStateJson",
                table: "Scenarios",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ValidationIssuesJson",
                table: "Scenarios",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "RunId",
                table: "OptimisationResults",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "DemandZones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemandZones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Plants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    DefaultMinCapacityMlPerDay = table.Column<double>(type: "double precision", nullable: true),
                    DefaultMaxCapacityMlPerDay = table.Column<double>(type: "double precision", nullable: true),
                    FixedActivationCost = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    TreatmentCostPerMlPerDay = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Plants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "QualityProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QualityProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Runs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    ScenarioId = table.Column<int>(type: "integer", nullable: false),
                    WorkflowStatus = table.Column<string>(type: "text", nullable: false),
                    SolverOutcome = table.Column<string>(type: "text", nullable: true),
                    ProgressMessage = table.Column<string>(type: "text", nullable: true),
                    ErrorCode = table.Column<string>(type: "text", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    SolveTimeMs = table.Column<double>(type: "double precision", nullable: true),
                    ObjectiveValue = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Runs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Runs_Scenarios_ScenarioId",
                        column: x => x.ScenarioId,
                        principalTable: "Scenarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlantZoneLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    PlantId = table.Column<int>(type: "integer", nullable: false),
                    ZoneId = table.Column<int>(type: "integer", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultCapacityMlPerDay = table.Column<double>(type: "double precision", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlantZoneLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlantZoneLinks_DemandZones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "DemandZones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlantZoneLinks_Plants_PlantId",
                        column: x => x.PlantId,
                        principalTable: "Plants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SourcePlantLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalId = table.Column<string>(type: "text", nullable: false),
                    SourceId = table.Column<int>(type: "integer", nullable: false),
                    PlantId = table.Column<int>(type: "integer", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultCapacityMlPerDay = table.Column<double>(type: "double precision", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SourcePlantLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SourcePlantLinks_Plants_PlantId",
                        column: x => x.PlantId,
                        principalTable: "Plants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SourcePlantLinks_WaterSources_SourceId",
                        column: x => x.SourceId,
                        principalTable: "WaterSources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QualityParameters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QualityProfileId = table.Column<int>(type: "integer", nullable: false),
                    ParameterId = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Unit = table.Column<string>(type: "text", nullable: false),
                    LowerLimit = table.Column<double>(type: "double precision", nullable: true),
                    UpperLimit = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QualityParameters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QualityParameters_QualityProfiles_QualityProfileId",
                        column: x => x.QualityProfileId,
                        principalTable: "QualityProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WaterSources_ExternalId",
                table: "WaterSources",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OptimisationResults_RunId",
                table: "OptimisationResults",
                column: "RunId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DemandZones_ExternalId",
                table: "DemandZones",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Plants_ExternalId",
                table: "Plants",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlantZoneLinks_ExternalId",
                table: "PlantZoneLinks",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlantZoneLinks_PlantId_ZoneId",
                table: "PlantZoneLinks",
                columns: new[] { "PlantId", "ZoneId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlantZoneLinks_ZoneId",
                table: "PlantZoneLinks",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_QualityParameters_QualityProfileId",
                table: "QualityParameters",
                column: "QualityProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_QualityProfiles_ExternalId",
                table: "QualityProfiles",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Runs_ExternalId",
                table: "Runs",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Runs_ScenarioId",
                table: "Runs",
                column: "ScenarioId");

            migrationBuilder.CreateIndex(
                name: "IX_SourcePlantLinks_ExternalId",
                table: "SourcePlantLinks",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SourcePlantLinks_PlantId",
                table: "SourcePlantLinks",
                column: "PlantId");

            migrationBuilder.CreateIndex(
                name: "IX_SourcePlantLinks_SourceId_PlantId",
                table: "SourcePlantLinks",
                columns: new[] { "SourceId", "PlantId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OptimisationResults_Runs_RunId",
                table: "OptimisationResults",
                column: "RunId",
                principalTable: "Runs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OptimisationResults_Runs_RunId",
                table: "OptimisationResults");

            migrationBuilder.DropTable(
                name: "PlantZoneLinks");

            migrationBuilder.DropTable(
                name: "QualityParameters");

            migrationBuilder.DropTable(
                name: "Runs");

            migrationBuilder.DropTable(
                name: "SourcePlantLinks");

            migrationBuilder.DropTable(
                name: "DemandZones");

            migrationBuilder.DropTable(
                name: "QualityProfiles");

            migrationBuilder.DropTable(
                name: "Plants");

            migrationBuilder.DropIndex(
                name: "IX_WaterSources_ExternalId",
                table: "WaterSources");

            migrationBuilder.DropIndex(
                name: "IX_OptimisationResults_RunId",
                table: "OptimisationResults");

            migrationBuilder.DropColumn(
                name: "AvailabilityStatus",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "CostPerMl",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "DefaultMaxWithdrawalMlPerDay",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "DefaultMinWithdrawalMlPerDay",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "IsEstimated",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "ModelReady",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "Provenance",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "QualityAlkalinityMgPerLCaCO3",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "QualityPH",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "QualityTurbidityNtu",
                table: "WaterSources");

            migrationBuilder.DropColumn(
                name: "FormStateJson",
                table: "Scenarios");

            migrationBuilder.DropColumn(
                name: "ValidationIssuesJson",
                table: "Scenarios");

            migrationBuilder.DropColumn(
                name: "RunId",
                table: "OptimisationResults");

            migrationBuilder.RenameColumn(
                name: "SourceType",
                table: "WaterSources",
                newName: "Type");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Scenarios",
                newName: "Name");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Scenarios",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
