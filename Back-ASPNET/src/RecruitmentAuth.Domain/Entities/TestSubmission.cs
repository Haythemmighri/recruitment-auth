using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Domain.Entities;

public class TestSubmission
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TestId { get; set; } = null!;
    public string CandidateId { get; set; } = null!;
    public SubmissionStatus Status { get; set; } = SubmissionStatus.IN_PROGRESS;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    public decimal? Score { get; set; }
    public decimal? MaxScore { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Test Test { get; set; } = null!;
    public virtual User Candidate { get; set; } = null!;
    public virtual ICollection<QuestionAnswer> Answers { get; set; } = new List<QuestionAnswer>();
}
