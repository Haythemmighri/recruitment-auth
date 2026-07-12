namespace RecruitmentAuth.Domain.Entities;

public class PasswordResetToken
{
    public string Id { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public string TokenHash { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public bool Used { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
