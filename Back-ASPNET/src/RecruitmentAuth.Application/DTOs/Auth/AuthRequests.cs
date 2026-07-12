using System.ComponentModel.DataAnnotations;

namespace RecruitmentAuth.Application.DTOs.Auth;

public class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    public string? RefreshToken { get; set; }
}

public class ForgotPasswordRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required] public string Token { get; set; } = string.Empty;
    [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
}

public class VerifyEmailRequest
{
    [Required] public string Token { get; set; } = string.Empty;
}

public class TwoFactorVerifyRequest
{
    [Required] public string TempToken { get; set; } = string.Empty;
    [Required] public string TotpCode { get; set; } = string.Empty;
}

public class TwoFactorEnableRequest
{
    [Required] public string TotpCode { get; set; } = string.Empty;
}

public class TwoFactorDisableRequest
{
    [Required] public string Password { get; set; } = string.Empty;
}

public class OauthVerifyRequest
{
    [Required] public string TempToken { get; set; } = string.Empty;
    [Required] public string Code { get; set; } = string.Empty;
}
