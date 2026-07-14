namespace RecruitmentAuth.Domain.Entities;

public class QuestionAnswer
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SubmissionId { get; set; } = null!;
    public string QuestionId { get; set; } = null!;
    public string? AnswerText { get; set; }
    public string? SelectedOptions { get; set; } // JSON string
    public bool? IsCorrect { get; set; }
    public decimal? PointsAwarded { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual TestSubmission Submission { get; set; } = null!;
    public virtual Question Question { get; set; } = null!;
}
