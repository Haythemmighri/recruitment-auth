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

    // ── New configuration fields ──────────────────────────────────────────────
    public int? PassingScore { get; set; }
    public DifficultyLevel? DifficultyLevel { get; set; }
    public bool RandomizeQuestions { get; set; } = false;
    public bool OneQuestionPerPage { get; set; } = false;
    public bool NegativeMarking { get; set; } = false;
    public bool AllowRetake { get; set; } = false;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool ShowResultsInstantly { get; set; } = true;
    /// <summary>JSON: { browserLock, webcam, tabSwitchDetection }</summary>
    public string? AntiCheating { get; set; }
    // ─────────────────────────────────────────────────────────────────────────

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual User Recruiter { get; set; } = null!;
    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();
    public virtual ICollection<TestSubmission> Submissions { get; set; } = new List<TestSubmission>();
    public virtual ICollection<TestSubscription> TestSubscriptions { get; set; } = new List<TestSubscription>();
}
