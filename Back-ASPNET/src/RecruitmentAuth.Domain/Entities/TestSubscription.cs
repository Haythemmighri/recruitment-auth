using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Domain.Entities;

public class TestSubscription
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TestId { get; set; } = null!;
    public string CandidateId { get; set; } = null!;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.PENDING;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Test Test { get; set; } = null!;
    public virtual User Candidate { get; set; } = null!;
}
