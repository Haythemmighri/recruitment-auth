using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RecruitmentAuth.Application.DTOs.Tests;

public class QcmOptionDto
{
    [Required]
    public string Label { get; set; } = null!;
    
    [Required]
    public string Value { get; set; } = null!;
    
    public bool IsCorrect { get; set; }
}

public class CreateQuestionDto
{
    [Required]
    public string Content { get; set; } = null!;
    
    public int OrderIndex { get; set; } = 0;
    
    public int Points { get; set; } = 1;

    public List<QcmOptionDto>? Options { get; set; }
    
    public string? ExpectedOutput { get; set; }
}

public class UpdateQuestionDto
{
    public string? Content { get; set; }
    public int? OrderIndex { get; set; }
    public int? Points { get; set; }
    public List<QcmOptionDto>? Options { get; set; }
    public string? ExpectedOutput { get; set; }
}

public class QuestionResponseDto
{
    public string Id { get; set; } = null!;
    public string TestId { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int OrderIndex { get; set; }
    public int Points { get; set; }
    public object? Options { get; set; }
    public string? ExpectedOutput { get; set; }
}
