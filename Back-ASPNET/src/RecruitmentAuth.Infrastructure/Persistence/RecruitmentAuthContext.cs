using Microsoft.EntityFrameworkCore;
using RecruitmentAuth.Application.Persistence;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.Infrastructure.Persistence;

/// <summary>
/// EF Core DbContext — implements IApplicationDbContext so the Application layer
/// can query the database without depending on EF Core or Pomelo directly.
/// </summary>
public class RecruitmentAuthContext : DbContext, IApplicationDbContext
{
    public RecruitmentAuthContext(DbContextOptions<RecruitmentAuthContext> options)
        : base(options) { }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }
    public virtual DbSet<EmailVerificationToken> EmailVerificationTokens { get; set; }
    public virtual DbSet<LoginAttempt> LoginAttempts { get; set; }
    public virtual DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }
    public virtual DbSet<User> Users { get; set; }
    
    public virtual DbSet<Test> Tests { get; set; }
    public virtual DbSet<Question> Questions { get; set; }
    public virtual DbSet<TestSubmission> TestSubmissions { get; set; }
    public virtual DbSet<QuestionAnswer> QuestionAnswers { get; set; }
    public virtual DbSet<TestSubscription> TestSubscriptions { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Connection string is injected via DI in Program.cs — no hardcoded values here.
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_general_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("audit_logs").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.CreatedAt, "audit_logs_created_at_idx");
            entity.HasIndex(e => e.Event, "audit_logs_event_idx");
            entity.HasIndex(e => e.UserId, "audit_logs_user_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("current_timestamp(3)").HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.Event).HasMaxLength(100).HasColumnName("event");
            entity.Property(e => e.IpAddress).HasMaxLength(45).HasColumnName("ip_address");
            entity.Property(e => e.Metadata).HasColumnName("metadata");
            entity.Property(e => e.UserAgent).HasMaxLength(500).HasColumnName("user_agent");
            entity.Property(e => e.UserId).HasMaxLength(191).HasColumnName("user_id");
            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("audit_logs_user_id_fkey");
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("email_verification_tokens").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.TokenHash, "email_verification_tokens_token_hash_idx").IsUnique();
            entity.HasIndex(e => e.UserId, "email_verification_tokens_user_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("current_timestamp(3)").HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime(3)").HasColumnName("expires_at");
            entity.Property(e => e.TokenHash).HasMaxLength(191).HasColumnName("token_hash");
            entity.Property(e => e.Used).HasColumnName("used");
            entity.Property(e => e.UserId).HasMaxLength(191).HasColumnName("user_id");
            entity.HasOne(d => d.User).WithMany(p => p.EmailVerificationTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("email_verification_tokens_user_id_fkey");
        });

        modelBuilder.Entity<LoginAttempt>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("login_attempts").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.CreatedAt, "login_attempts_created_at_idx");
            entity.HasIndex(e => new { e.Email, e.IpAddress }, "login_attempts_email_ip_address_idx");
            entity.HasIndex(e => e.UserId, "login_attempts_user_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("current_timestamp(3)").HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.FailureReason).HasMaxLength(200).HasColumnName("failure_reason");
            entity.Property(e => e.IpAddress).HasMaxLength(45).HasColumnName("ip_address");
            entity.Property(e => e.Success).HasColumnName("success");
            entity.Property(e => e.UserId).HasMaxLength(191).HasColumnName("user_id");
            entity.HasOne(d => d.User).WithMany(p => p.LoginAttempts)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("login_attempts_user_id_fkey");
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("password_reset_tokens").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.TokenHash, "password_reset_tokens_token_hash_idx").IsUnique();
            entity.HasIndex(e => e.UserId, "password_reset_tokens_user_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("current_timestamp(3)").HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime(3)").HasColumnName("expires_at");
            entity.Property(e => e.TokenHash).HasMaxLength(191).HasColumnName("token_hash");
            entity.Property(e => e.Used).HasColumnName("used");
            entity.Property(e => e.UserId).HasMaxLength(191).HasColumnName("user_id");
            entity.HasOne(d => d.User).WithMany(p => p.PasswordResetTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("password_reset_tokens_user_id_fkey");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("refresh_tokens").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.Family, "refresh_tokens_family_idx");
            entity.HasIndex(e => e.Revoked, "refresh_tokens_revoked_idx");
            entity.HasIndex(e => e.TokenHash, "refresh_tokens_token_hash_idx").IsUnique();
            entity.HasIndex(e => e.UserId, "refresh_tokens_user_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("current_timestamp(3)").HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnType("datetime(3)").HasColumnName("expires_at");
            entity.Property(e => e.Family).HasMaxLength(191).HasColumnName("family");
            entity.Property(e => e.IpAddress).HasMaxLength(45).HasColumnName("ip_address");
            entity.Property(e => e.Revoked).HasColumnName("revoked");
            entity.Property(e => e.TokenHash).HasMaxLength(191).HasColumnName("token_hash");
            entity.Property(e => e.UserAgent).HasMaxLength(500).HasColumnName("user_agent");
            entity.Property(e => e.UserId).HasMaxLength(191).HasColumnName("user_id");
            entity.HasOne(d => d.User).WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("refresh_tokens_user_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("users").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.Email, "users_email_idx").IsUnique();
            entity.HasIndex(e => e.GithubId, "users_github_id_key").IsUnique();
            entity.HasIndex(e => e.GoogleId, "users_google_id_key").IsUnique();
            entity.HasIndex(e => e.LinkedinId, "users_linkedin_id_key").IsUnique();
            entity.HasIndex(e => e.Phone, "users_phone_idx").IsUnique();
            entity.HasIndex(e => e.Status, "users_status_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.AvatarUrl).HasMaxLength(191).HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("current_timestamp(3)").HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.FirstName).HasMaxLength(100).HasColumnName("first_name");
            entity.Property(e => e.GithubId).HasMaxLength(191).HasColumnName("github_id");
            entity.Property(e => e.GoogleId).HasMaxLength(191).HasColumnName("google_id");
            entity.Property(e => e.IsEmailVerified).HasColumnName("is_email_verified");
            entity.Property(e => e.IsTwoFactorEnabled).HasColumnName("is_two_factor_enabled");
            entity.Property(e => e.LastLoginAt).HasColumnType("datetime(3)").HasColumnName("last_login_at");
            entity.Property(e => e.LastName).HasMaxLength(100).HasColumnName("last_name");
            entity.Property(e => e.LinkedinId).HasMaxLength(191).HasColumnName("linkedin_id");
            entity.Property(e => e.PasswordHash).HasMaxLength(191).HasColumnName("password_hash");
            entity.Property(e => e.Phone).HasMaxLength(20).HasColumnName("phone");
            entity.Property(e => e.Role)
                .HasDefaultValueSql("'CANDIDATE'")
                .HasColumnType("enum('CANDIDATE','RECRUITER','ADMIN')")
                .HasColumnName("role");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'PENDING_VERIFICATION'")
                .HasColumnType("enum('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DELETED')")
                .HasColumnName("status");
            entity.Property(e => e.TwoFactorSecret).HasMaxLength(191).HasColumnName("two_factor_secret");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime(3)").HasColumnName("updated_at");
        });

        modelBuilder.Entity<Test>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("tests").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.RecruiterId, "tests_recruiter_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.RecruiterId).HasMaxLength(191).HasColumnName("recruiter_id");
            entity.Property(e => e.Title).HasMaxLength(255).HasColumnName("title");
            entity.Property(e => e.Description).HasColumnType("text").HasColumnName("description");
            entity.Property(e => e.Category).HasColumnType("varchar(100)").HasConversion<string>().HasColumnName("category");
            entity.Property(e => e.Type).HasColumnType("varchar(50)").HasConversion<string>().HasColumnName("type");
            entity.Property(e => e.Status).HasColumnType("varchar(50)").HasConversion<string>().HasColumnName("status");
            entity.Property(e => e.DurationMinutes).HasColumnName("duration_minutes");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime(3)").HasColumnName("updated_at");
            
            entity.HasOne(d => d.Recruiter).WithMany(p => p.CreatedTests)
                .HasForeignKey(d => d.RecruiterId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("tests_recruiter_id_fkey");
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("questions").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => e.TestId, "questions_test_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.TestId).HasMaxLength(191).HasColumnName("test_id");
            entity.Property(e => e.Content).HasColumnType("text").HasColumnName("content");
            entity.Property(e => e.OrderIndex).HasColumnName("order_index");
            entity.Property(e => e.Points).HasColumnName("points");
            entity.Property(e => e.Options).HasColumnType("json").HasColumnName("options");
            entity.Property(e => e.ExpectedOutput).HasColumnType("text").HasColumnName("expected_output");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime(3)").HasColumnName("updated_at");

            entity.HasOne(d => d.Test).WithMany(p => p.Questions)
                .HasForeignKey(d => d.TestId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("questions_test_id_fkey");
        });

        modelBuilder.Entity<TestSubmission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("test_submissions").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => new { e.TestId, e.CandidateId }, "test_submissions_test_candidate_unique").IsUnique();
            entity.HasIndex(e => e.CandidateId, "test_submissions_candidate_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.TestId).HasMaxLength(191).HasColumnName("test_id");
            entity.Property(e => e.CandidateId).HasMaxLength(191).HasColumnName("candidate_id");
            entity.Property(e => e.Status).HasColumnType("varchar(50)").HasConversion<string>().HasColumnName("status");
            entity.Property(e => e.StartedAt).HasColumnType("datetime(3)").HasColumnName("started_at");
            entity.Property(e => e.SubmittedAt).HasColumnType("datetime(3)").HasColumnName("submitted_at");
            entity.Property(e => e.Score).HasColumnType("decimal(5,2)").HasColumnName("score");
            entity.Property(e => e.MaxScore).HasColumnType("decimal(5,2)").HasColumnName("max_score");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime(3)").HasColumnName("updated_at");

            entity.HasOne(d => d.Test).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.TestId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("test_submissions_test_id_fkey");

            entity.HasOne(d => d.Candidate).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.CandidateId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("test_submissions_candidate_id_fkey");
        });

        modelBuilder.Entity<QuestionAnswer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("question_answers").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => new { e.SubmissionId, e.QuestionId }, "question_answers_sub_question_unique").IsUnique();
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.SubmissionId).HasMaxLength(191).HasColumnName("submission_id");
            entity.Property(e => e.QuestionId).HasMaxLength(191).HasColumnName("question_id");
            entity.Property(e => e.AnswerText).HasColumnType("text").HasColumnName("answer_text");
            entity.Property(e => e.SelectedOptions).HasColumnType("json").HasColumnName("selected_options");
            entity.Property(e => e.IsCorrect).HasColumnName("is_correct");
            entity.Property(e => e.PointsAwarded).HasColumnType("decimal(5,2)").HasColumnName("points_awarded");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime(3)").HasColumnName("updated_at");

            entity.HasOne(d => d.Submission).WithMany(p => p.Answers)
                .HasForeignKey(d => d.SubmissionId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("question_answers_submission_id_fkey");

            entity.HasOne(d => d.Question).WithMany(p => p.Answers)
                .HasForeignKey(d => d.QuestionId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("question_answers_question_id_fkey");
        });

        modelBuilder.Entity<TestSubscription>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
            entity.ToTable("test_subscriptions").UseCollation("utf8mb4_unicode_ci");
            entity.HasIndex(e => new { e.TestId, e.CandidateId }, "test_subscriptions_test_candidate_unique").IsUnique();
            entity.HasIndex(e => e.CandidateId, "test_subscriptions_candidate_id_idx");
            entity.Property(e => e.Id).HasMaxLength(191).HasColumnName("id");
            entity.Property(e => e.TestId).HasMaxLength(191).HasColumnName("test_id");
            entity.Property(e => e.CandidateId).HasMaxLength(191).HasColumnName("candidate_id");
            entity.Property(e => e.Status).HasColumnType("varchar(50)").HasConversion<string>().HasColumnName("status");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime(3)").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime(3)").HasColumnName("updated_at");

            entity.HasOne(d => d.Test).WithMany(p => p.TestSubscriptions)
                .HasForeignKey(d => d.TestId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("test_subscriptions_test_id_fkey");

            entity.HasOne(d => d.Candidate).WithMany(p => p.TestSubscriptions)
                .HasForeignKey(d => d.CandidateId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("test_subscriptions_candidate_id_fkey");
        });
    }
}
