using System.Text.Json;

namespace RecruitmentAuth.Domain.Entities;

public class Question
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TestId { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int OrderIndex { get; set; } = 0;
    public int Points { get; set; } = 1;
    public string? Options { get; set; } // JSON string
    public string? ExpectedOutput { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Test Test { get; set; } = null!;
    public virtual ICollection<QuestionAnswer> Answers { get; set; } = new List<QuestionAnswer>();
}
