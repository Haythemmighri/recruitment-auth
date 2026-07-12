using System.ComponentModel.DataAnnotations;

namespace RecruitmentAuth.Application.DTOs.Auth;

public class RegisterRequest
{
    [Required] public string FirstName { get; set; } = string.Empty;
    [Required] public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    /// <summary>CANDIDATE | RECRUITER</summary>
    public string Role { get; set; } = "CANDIDATE";
}
