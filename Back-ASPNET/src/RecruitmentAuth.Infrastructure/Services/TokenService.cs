using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RecruitmentAuth.Application.Services;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.Infrastructure.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateAccessToken(User user)
    {
        var secret = _config["JWT_ACCESS_SECRET"]
            ?? throw new InvalidOperationException("JWT_ACCESS_SECRET not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiresInStr = _config["JWT_ACCESS_EXPIRES_IN"] ?? "15m";
        var expiresIn = ParseDuration(expiresInStr);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("firstName", user.FirstName),
            new Claim("lastName", user.LastName),
            new Claim("role", user.Role),
            new Claim("status", user.Status),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.Add(expiresIn),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public ClaimsPrincipal? ValidateAccessToken(string token)
    {
        var secret = _config["JWT_ACCESS_SECRET"] ?? "";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

        var validator = new JwtSecurityTokenHandler();
        try
        {
            return validator.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out _);
        }
        catch
        {
            return null;
        }
    }

    public string GenerateTempToken(string userId)
    {
        var secret = _config["JWT_ACCESS_SECRET"]
            ?? throw new InvalidOperationException("JWT_ACCESS_SECRET not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim("type", "temp_2fa")
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string? VerifyTempToken(string token)
    {
        var principal = ValidateAccessToken(token);
        if (principal == null) return null;

        var type = principal.FindFirst("type")?.Value;
        if (type != "temp_2fa") return null;

        return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? principal.FindFirst("sub")?.Value;
    }

    private static TimeSpan ParseDuration(string duration)
    {
        if (duration.EndsWith('d'))
            return TimeSpan.FromDays(int.Parse(duration[..^1]));
        if (duration.EndsWith('h'))
            return TimeSpan.FromHours(int.Parse(duration[..^1]));
        if (duration.EndsWith('m'))
            return TimeSpan.FromMinutes(int.Parse(duration[..^1]));
        if (duration.EndsWith('s'))
            return TimeSpan.FromSeconds(int.Parse(duration[..^1]));
        return TimeSpan.FromMinutes(15);
    }
}
