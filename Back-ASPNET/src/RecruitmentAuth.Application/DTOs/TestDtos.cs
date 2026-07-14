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
    
    public int? DurationMinutes { get; set; }
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public object? Recruiter { get; set; }
    public int QuestionsCount { get; set; }
    public int SubmissionsCount { get; set; }
}
