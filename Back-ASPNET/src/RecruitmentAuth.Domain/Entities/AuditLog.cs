namespace RecruitmentAuth.Domain.Entities;
public class AuditLog
{
    public string Id { get; set; } = null!;
    public string? UserId { get; set; }
    public string Event { get; set; } = null!;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual User? User { get; set; }
}