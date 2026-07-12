namespace RecruitmentAuth.Domain.Entities;

public class LoginAttempt
{
    public string Id { get; set; } = null!;
    public string? UserId { get; set; }
    public string Email { get; set; } = null!;
    public string IpAddress { get; set; } = null!;
    public bool Success { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
