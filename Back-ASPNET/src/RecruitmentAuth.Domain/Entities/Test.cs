using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Domain.Entities;

public class Test
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RecruiterId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public TestCategory Category { get; set; }
    public TestType Type { get; set; }
    public TestStatus Status { get; set; } = TestStatus.DRAFT;
    public string? RejectionReason { get; set; }
    public int? DurationMinutes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual User Recruiter { get; set; } = null!;
    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();
    public virtual ICollection<TestSubmission> Submissions { get; set; } = new List<TestSubmission>();
}
