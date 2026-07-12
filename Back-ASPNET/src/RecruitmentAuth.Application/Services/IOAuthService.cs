using RecruitmentAuth.Application.DTOs.Auth;

namespace RecruitmentAuth.Application.Services;

/// <summary>
/// Handles OAuth 2.0 social login flows (Google, GitHub, LinkedIn).
/// </summary>
public interface IOAuthService
{
    Task<LoginResult> HandleGoogleCallbackAsync(string code, string ipAddress, string? userAgent);
    Task<LoginResult> HandleGithubCallbackAsync(string code, string ipAddress, string? userAgent);
    Task<LoginResult> HandleLinkedinCallbackAsync(string code, string ipAddress, string? userAgent);
}
