using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecruitmentAuth.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTestSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowRetake",
                table: "tests",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AntiCheating",
                table: "tests",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "AvailableFrom",
                table: "tests",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AvailableUntil",
                table: "tests",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DifficultyLevel",
                table: "tests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NegativeMarking",
                table: "tests",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "OneQuestionPerPage",
                table: "tests",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PassingScore",
                table: "tests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RandomizeQuestions",
                table: "tests",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowResultsInstantly",
                table: "tests",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CodeLanguage",
                table: "questions",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CodeStarter",
                table: "questions",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CorrectOrder",
                table: "questions",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Explanation",
                table: "questions",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MatchPairs",
                table: "questions",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MediaUrl",
                table: "questions",
                type: "longtext",
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "NumericalMax",
                table: "questions",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NumericalMin",
                table: "questions",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuestionType",
                table: "questions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "Tolerance",
                table: "questions",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "test_subscriptions",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    test_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    candidate_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(50)", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "test_subscriptions_candidate_id_fkey",
                        column: x => x.candidate_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "test_subscriptions_test_id_fkey",
                        column: x => x.test_id,
                        principalTable: "tests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateIndex(
                name: "test_subscriptions_candidate_id_idx",
                table: "test_subscriptions",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "test_subscriptions_test_candidate_unique",
                table: "test_subscriptions",
                columns: new[] { "test_id", "candidate_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "test_subscriptions");

            migrationBuilder.DropColumn(
                name: "AllowRetake",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "AntiCheating",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "AvailableFrom",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "AvailableUntil",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "DifficultyLevel",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "NegativeMarking",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "OneQuestionPerPage",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "PassingScore",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "RandomizeQuestions",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "ShowResultsInstantly",
                table: "tests");

            migrationBuilder.DropColumn(
                name: "CodeLanguage",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "CodeStarter",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "CorrectOrder",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "Explanation",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "MatchPairs",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "MediaUrl",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "NumericalMax",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "NumericalMin",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "QuestionType",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "Tolerance",
                table: "questions");
        }
    }
}
