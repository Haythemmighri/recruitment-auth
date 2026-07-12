using RecruitmentAuth.Application.DTOs.Auth;

namespace RecruitmentAuth.Application.Services;

/// <summary>
/// Handles all authentication use-cases: register, login, 2FA, token refresh, logout,
/// email verification, password reset, and current-user retrieval.
/// </summary>
public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, string ipAddress, string? userAgent);
    Task<LoginResult> LoginAsync(LoginRequest request, string ipAddress, string? userAgent);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken, string ipAddress, string? userAgent);
    Task LogoutAsync(string refreshToken);
    Task<bool> VerifyEmailAsync(string token);
    Task ForgotPasswordAsync(string email, string ipAddress);
    Task ResetPasswordAsync(string token, string newPassword);
    Task<UserDto> GetCurrentUserAsync(string userId);
    Task<AuthResponse> VerifyTwoFactorAsync(string tempToken, string totpCode, string ipAddress, string? userAgent);
    Task<AuthResponse> VerifyOauthCodeAsync(string tempToken, string code, string ipAddress, string? userAgent);
    Task<object> SetupTwoFactorAsync(string userId);
    Task<object> EnableTwoFactorAsync(string userId, string totpCode);
    Task<object> DisableTwoFactorAsync(string userId, string password);
}
