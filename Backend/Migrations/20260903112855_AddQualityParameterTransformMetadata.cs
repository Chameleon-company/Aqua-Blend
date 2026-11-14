using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AquaBlend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQualityParameterTransformMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ModelName",
                table: "QualityParameters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModelUnit",
                table: "QualityParameters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceField",
                table: "QualityParameters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Transform",
                table: "QualityParameters",
                type: "text",
                nullable: false,
                defaultValue: "identity");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModelName",
                table: "QualityParameters");

            migrationBuilder.DropColumn(
                name: "ModelUnit",
                table: "QualityParameters");

            migrationBuilder.DropColumn(
                name: "SourceField",
                table: "QualityParameters");

            migrationBuilder.DropColumn(
                name: "Transform",
                table: "QualityParameters");
        }
    }
}
