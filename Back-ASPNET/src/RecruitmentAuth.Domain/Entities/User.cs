namespace RecruitmentAuth.Domain.Entities;

public class User
{
    public string Id { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? PasswordHash { get; set; }
    public string Role { get; set; } = null!;
    public string Status { get; set; } = null!;
    public bool IsEmailVerified { get; set; }
    public bool IsTwoFactorEnabled { get; set; }
    public string? TwoFactorSecret { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? AvatarUrl { get; set; }
    public string? GithubId { get; set; }
    public string? GoogleId { get; set; }
    public string? LinkedinId { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public virtual ICollection<EmailVerificationToken> EmailVerificationTokens { get; set; } = new List<EmailVerificationToken>();
    public virtual ICollection<LoginAttempt> LoginAttempts { get; set; } = new List<LoginAttempt>();
    public virtual ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    
    public virtual ICollection<Test> CreatedTests { get; set; } = new List<Test>();
    public virtual ICollection<TestSubmission> Submissions { get; set; } = new List<TestSubmission>();
}
