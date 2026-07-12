using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitmentAuth.API.Helpers;
using RecruitmentAuth.Application.DTOs.Auth;
using RecruitmentAuth.Application.Persistence;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IApplicationDbContext _db;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IApplicationDbContext db, ILogger<UsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private string? GetCurrentUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Not authenticated." });

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        return Ok(ApiResponse<UserDto>.Ok(MapToDto(user)));
    }

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Not authenticated." });

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        if (!string.IsNullOrEmpty(request.FirstName)) user.FirstName = request.FirstName;
        if (!string.IsNullOrEmpty(request.LastName)) user.LastName = request.LastName;
        if (request.Phone != null) user.Phone = request.Phone;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(ApiResponse<UserDto>.Ok(MapToDto(user), "Profile updated."));
    }

    [HttpGet("me/sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Not authenticated." });

        var sessions = await _db.RefreshTokens
            .Where(t => t.UserId == userId && !t.Revoked && t.ExpiresAt > DateTime.UtcNow)
            .Select(t => new
            {
                family = t.Family,
                userAgent = t.UserAgent,
                ip = t.IpAddress,
                createdAt = t.CreatedAt,
                expiresAt = t.ExpiresAt
            })
            .OrderByDescending(t => t.createdAt)
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(sessions));
    }

    [HttpDelete("me/sessions/{family}")]
    public async Task<IActionResult> RevokeSession(string family)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Not authenticated." });

        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.Family == family && !t.Revoked)
            .ToListAsync();

        foreach (var t in tokens) t.Revoked = true;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "Session revoked." });
    }

    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        Phone = user.Phone,
        Role = user.Role,
        Status = user.Status,
        IsEmailVerified = user.IsEmailVerified,
        IsTwoFactorEnabled = user.IsTwoFactorEnabled,
        AvatarUrl = user.AvatarUrl,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    };
}

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
}
