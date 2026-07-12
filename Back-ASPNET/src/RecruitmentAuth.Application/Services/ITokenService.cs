using System.Security.Claims;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.Application.Services;

/// <summary>
/// Responsible for generating, validating, and hashing JWT/refresh tokens.
/// </summary>
public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    string HashToken(string token);
    ClaimsPrincipal? ValidateAccessToken(string token);
    string GenerateTempToken(string userId);
    string? VerifyTempToken(string token);
}
