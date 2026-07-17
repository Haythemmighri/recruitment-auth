using System.ComponentModel.DataAnnotations;
using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Application.DTOs.Tests;

public class CreateTestDto
{
    [Required, StringLength(255, MinimumLength = 3)]
    public string Title { get; set; } = null!;

    [StringLength(5000)]
    public string? Description { get; set; }

    [Required]
    public TestCategory Category { get; set; }

    [Required]
    public TestType Type { get; set; }

    [Range(1, int.MaxValue)]
    public int? DurationMinutes { get; set; }

    // ── New configuration fields ──────────────────────────────────────────────
    [Range(0, 100)]
    public int? PassingScore { get; set; }

    public DifficultyLevel? DifficultyLevel { get; set; }
    public bool RandomizeQuestions { get; set; } = false;
    public bool OneQuestionPerPage { get; set; } = false;
    public bool NegativeMarking { get; set; } = false;
    public bool AllowRetake { get; set; } = false;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool ShowResultsInstantly { get; set; } = true;
    public AntiCheatingDto? AntiCheating { get; set; }
}

public class AntiCheatingDto
{
    public bool BrowserLock { get; set; } = false;
    public bool Webcam { get; set; } = false;
    public bool TabSwitchDetection { get; set; } = false;
}

public class UpdateTestDto
{
    [StringLength(255, MinimumLength = 3)]
    public string? Title { get; set; }

    [StringLength(5000)]
    public string? Description { get; set; }

    public TestCategory? Category { get; set; }
    public TestType? Type { get; set; }
    public int? DurationMinutes { get; set; }

    // ── New configuration fields ──────────────────────────────────────────────
    [Range(0, 100)]
    public int? PassingScore { get; set; }

    public DifficultyLevel? DifficultyLevel { get; set; }
    public bool? RandomizeQuestions { get; set; }
    public bool? OneQuestionPerPage { get; set; }
    public bool? NegativeMarking { get; set; }
    public bool? AllowRetake { get; set; }
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool? ShowResultsInstantly { get; set; }
    public AntiCheatingDto? AntiCheating { get; set; }
}

public class TestResponseDto
{
    public string Id { get; set; } = null!;
    public string RecruiterId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Category { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string Status { get; set; } = null!;
    public int? DurationMinutes { get; set; }

    // ── New configuration fields ──────────────────────────────────────────────
    public int? PassingScore { get; set; }
    public string? DifficultyLevel { get; set; }
    public bool RandomizeQuestions { get; set; }
    public bool OneQuestionPerPage { get; set; }
    public bool NegativeMarking { get; set; }
    public bool AllowRetake { get; set; }
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool ShowResultsInstantly { get; set; }
    public object? AntiCheating { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public object? Recruiter { get; set; }
    public int QuestionsCount { get; set; }
    public int SubmissionsCount { get; set; }
}
