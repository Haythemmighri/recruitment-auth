using System.ComponentModel.DataAnnotations;

namespace RecruitmentAuth.Application.DTOs.Tests;

public class RejectTestDto
{
    [Required(ErrorMessage = "Rejection reason is required.")]
    public string Reason { get; set; } = string.Empty;
}
