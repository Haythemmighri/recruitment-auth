using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Domain.Entities;

public class Question
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TestId { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int OrderIndex { get; set; } = 0;
    public int Points { get; set; } = 1;
    public QuestionType QuestionType { get; set; } = QuestionType.MCQ_SINGLE;

    /// <summary>JSON array: [{label, value, isCorrect}] — used by MCQ_SINGLE, MCQ_MULTI, TRUE_FALSE</summary>
    public string? Options { get; set; }

    /// <summary>Expected answer for CODE_EDITOR / FILL_BLANK grading</summary>
    public string? ExpectedOutput { get; set; }

    // ── Type-specific fields ──────────────────────────────────────────────────
    /// <summary>Post-answer explanation shown to candidate after submission</summary>
    public string? Explanation { get; set; }

    /// <summary>Optional image/video URL attached to the question</summary>
    public string? MediaUrl { get; set; }

    /// <summary>Programming language for CODE_EDITOR (e.g. "javascript", "python")</summary>
    public string? CodeLanguage { get; set; }

    /// <summary>Starter code template for CODE_EDITOR questions</summary>
    public string? CodeStarter { get; set; }

    /// <summary>JSON array: [{left, right}] — correct pairs for MATCHING questions</summary>
    public string? MatchPairs { get; set; }

    /// <summary>JSON array: [string, ...] — correct sequence for ORDERING/DRAG_DROP questions</summary>
    public string? CorrectOrder { get; set; }

    /// <summary>Minimum accepted value for NUMERICAL questions</summary>
    public decimal? NumericalMin { get; set; }

    /// <summary>Maximum accepted value for NUMERICAL questions</summary>
    public decimal? NumericalMax { get; set; }

    /// <summary>Acceptable ± tolerance for NUMERICAL questions</summary>
    public decimal? Tolerance { get; set; }
    // ─────────────────────────────────────────────────────────────────────────

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Test Test { get; set; } = null!;
    public virtual ICollection<QuestionAnswer> Answers { get; set; } = new List<QuestionAnswer>();
}
