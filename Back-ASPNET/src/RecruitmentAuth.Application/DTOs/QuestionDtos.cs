using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RecruitmentAuth.Domain.Enums;

namespace RecruitmentAuth.Application.DTOs.Tests;

public class QcmOptionDto
{
    [Required]
    public string Label { get; set; } = null!;

    [Required]
    public string Value { get; set; } = null!;

    public bool IsCorrect { get; set; }
}

public class MatchPairDto
{
    [Required]
    public string Left { get; set; } = null!;

    [Required]
    public string Right { get; set; } = null!;
}

public class CreateQuestionDto
{
    [Required]
    public string Content { get; set; } = null!;

    public int OrderIndex { get; set; } = 0;

    [Range(1, int.MaxValue)]
    public int Points { get; set; } = 1;

    public QuestionType QuestionType { get; set; } = QuestionType.MCQ_SINGLE;

    // MCQ_SINGLE | MCQ_MULTI | TRUE_FALSE
    [MinLength(2)]
    public List<QcmOptionDto>? Options { get; set; }

    // CODE_EDITOR / FILL_BLANK
    public string? ExpectedOutput { get; set; }

    // CODE_EDITOR
    [StringLength(50)]
    public string? CodeLanguage { get; set; }
    public string? CodeStarter { get; set; }

    // MATCHING
    [MinLength(2)]
    public List<MatchPairDto>? MatchPairs { get; set; }

    // ORDERING / DRAG_DROP
    [MinLength(2)]
    public List<string>? CorrectOrder { get; set; }

    // NUMERICAL
    public decimal? NumericalMin { get; set; }
    public decimal? NumericalMax { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? Tolerance { get; set; }

    // Shared enrichment
    public string? Explanation { get; set; }

    [Url]
    public string? MediaUrl { get; set; }
}

public class UpdateQuestionDto
{
    public string? Content { get; set; }
    public int? OrderIndex { get; set; }
    public int? Points { get; set; }
    public QuestionType? QuestionType { get; set; }
    public List<QcmOptionDto>? Options { get; set; }
    public string? ExpectedOutput { get; set; }
    public string? CodeLanguage { get; set; }
    public string? CodeStarter { get; set; }
    public List<MatchPairDto>? MatchPairs { get; set; }
    public List<string>? CorrectOrder { get; set; }
    public decimal? NumericalMin { get; set; }
    public decimal? NumericalMax { get; set; }
    public decimal? Tolerance { get; set; }
    public string? Explanation { get; set; }
    public string? MediaUrl { get; set; }
}

public class QuestionResponseDto
{
    public string Id { get; set; } = null!;
    public string TestId { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int OrderIndex { get; set; }
    public int Points { get; set; }
    public string QuestionType { get; set; } = null!;

    // Conditionally exposed fields
    public object? Options { get; set; }
    public string? ExpectedOutput { get; set; }
    public string? Explanation { get; set; }
    public string? MediaUrl { get; set; }
    public string? CodeLanguage { get; set; }
    public string? CodeStarter { get; set; }
    public object? MatchPairs { get; set; }
    public object? CorrectOrder { get; set; }
    public decimal? NumericalMin { get; set; }
    public decimal? NumericalMax { get; set; }
    public decimal? Tolerance { get; set; }
}
