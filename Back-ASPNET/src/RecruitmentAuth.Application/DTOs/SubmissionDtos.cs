using System.ComponentModel.DataAnnotations;

namespace RecruitmentAuth.Application.DTOs.Tests;

public class AnswerItemDto
{
    [Required]
    public string QuestionId { get; set; } = null!;
    
    public string? AnswerText { get; set; }
    
    public List<string>? SelectedOptions { get; set; }
}

public class SubmitAnswersDto
{
    [Required, MinLength(1)]
    public List<AnswerItemDto> Answers { get; set; } = new();
}

public class GradeSubmissionDto
{
    [Required, Range(0, double.MaxValue)]
    public decimal Score { get; set; }
}
