using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecruitmentAuth.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    first_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "varchar(255)", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    password_hash = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    role = table.Column<string>(type: "enum('CANDIDATE','RECRUITER','ADMIN')", nullable: false, defaultValueSql: "'CANDIDATE'", collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DELETED')", nullable: false, defaultValueSql: "'PENDING_VERIFICATION'", collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_email_verified = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_two_factor_enabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    two_factor_secret = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_login_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "current_timestamp(3)"),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    avatar_url = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    github_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    google_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    linkedin_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    @event = table.Column<string>(name: "event", type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ip_address = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_agent = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    metadata = table.Column<string>(type: "longtext", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "current_timestamp(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "audit_logs_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "email_verification_tokens",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    token_hash = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    expires_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    used = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "current_timestamp(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "email_verification_tokens_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "login_attempts",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "varchar(255)", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ip_address = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    success = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    failure_reason = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "current_timestamp(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "login_attempts_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "password_reset_tokens",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    token_hash = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    expires_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    used = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "current_timestamp(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "password_reset_tokens_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    token_hash = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    family = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    expires_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    revoked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ip_address = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_agent = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "current_timestamp(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "refresh_tokens_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "tests",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    recruiter_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    title = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    category = table.Column<string>(type: "varchar(100)", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    type = table.Column<string>(type: "varchar(50)", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(50)", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    duration_minutes = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "tests_recruiter_id_fkey",
                        column: x => x.recruiter_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "questions",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    test_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content = table.Column<string>(type: "text", nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    order_index = table.Column<int>(type: "int", nullable: false),
                    points = table.Column<int>(type: "int", nullable: false),
                    options = table.Column<string>(type: "json", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    expected_output = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "questions_test_id_fkey",
                        column: x => x.test_id,
                        principalTable: "tests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "test_submissions",
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
                    started_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    score = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    max_score = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "test_submissions_candidate_id_fkey",
                        column: x => x.candidate_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "test_submissions_test_id_fkey",
                        column: x => x.test_id,
                        principalTable: "tests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateTable(
                name: "question_answers",
                columns: table => new
                {
                    id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    submission_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    question_id = table.Column<string>(type: "varchar(191)", maxLength: 191, nullable: false, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    answer_text = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    selected_options = table.Column<string>(type: "json", nullable: true, collation: "utf8mb4_unicode_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_correct = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    points_awarded = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "question_answers_question_id_fkey",
                        column: x => x.question_id,
                        principalTable: "questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "question_answers_submission_id_fkey",
                        column: x => x.submission_id,
                        principalTable: "test_submissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_unicode_ci");

            migrationBuilder.CreateIndex(
                name: "audit_logs_created_at_idx",
                table: "audit_logs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "audit_logs_event_idx",
                table: "audit_logs",
                column: "event");

            migrationBuilder.CreateIndex(
                name: "audit_logs_user_id_idx",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "email_verification_tokens_token_hash_idx",
                table: "email_verification_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "email_verification_tokens_user_id_idx",
                table: "email_verification_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "login_attempts_created_at_idx",
                table: "login_attempts",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "login_attempts_email_ip_address_idx",
                table: "login_attempts",
                columns: new[] { "email", "ip_address" });

            migrationBuilder.CreateIndex(
                name: "login_attempts_user_id_idx",
                table: "login_attempts",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "password_reset_tokens_token_hash_idx",
                table: "password_reset_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "password_reset_tokens_user_id_idx",
                table: "password_reset_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_question_answers_question_id",
                table: "question_answers",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "question_answers_sub_question_unique",
                table: "question_answers",
                columns: new[] { "submission_id", "question_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "questions_test_id_idx",
                table: "questions",
                column: "test_id");

            migrationBuilder.CreateIndex(
                name: "refresh_tokens_family_idx",
                table: "refresh_tokens",
                column: "family");

            migrationBuilder.CreateIndex(
                name: "refresh_tokens_revoked_idx",
                table: "refresh_tokens",
                column: "revoked");

            migrationBuilder.CreateIndex(
                name: "refresh_tokens_token_hash_idx",
                table: "refresh_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "refresh_tokens_user_id_idx",
                table: "refresh_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "test_submissions_candidate_id_idx",
                table: "test_submissions",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "test_submissions_test_candidate_unique",
                table: "test_submissions",
                columns: new[] { "test_id", "candidate_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "tests_recruiter_id_idx",
                table: "tests",
                column: "recruiter_id");

            migrationBuilder.CreateIndex(
                name: "users_email_idx",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_github_id_key",
                table: "users",
                column: "github_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_google_id_key",
                table: "users",
                column: "google_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_linkedin_id_key",
                table: "users",
                column: "linkedin_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_phone_idx",
                table: "users",
                column: "phone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "users_status_idx",
                table: "users",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "email_verification_tokens");

            migrationBuilder.DropTable(
                name: "login_attempts");

            migrationBuilder.DropTable(
                name: "password_reset_tokens");

            migrationBuilder.DropTable(
                name: "question_answers");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "questions");

            migrationBuilder.DropTable(
                name: "test_submissions");

            migrationBuilder.DropTable(
                name: "tests");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
