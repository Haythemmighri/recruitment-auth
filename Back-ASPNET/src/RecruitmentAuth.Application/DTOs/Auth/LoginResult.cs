namespace RecruitmentAuth.Application.DTOs.Auth;

public class LoginResult
{
    public bool RequiresTwoFactor { get; set; }
    public bool RequiresOauthVerification { get; set; }
    public string? TempToken { get; set; }
    public AuthResponse? AuthResponse { get; set; }
}
