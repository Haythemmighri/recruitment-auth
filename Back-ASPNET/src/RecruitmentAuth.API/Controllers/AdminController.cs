using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecruitmentAuth.API.Helpers;
using RecruitmentAuth.Application.Persistence;

namespace RecruitmentAuth.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "ADMIN")]
public class AdminController : ControllerBase
{
    private readonly IApplicationDbContext _db;

    public AdminController(IApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? role = null, [FromQuery] string? status = null, [FromQuery] string? search = null)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role.ToUpper());
            
        if (!string.IsNullOrEmpty(status))
            query = query.Where(u => u.Status == status.ToUpper());
            
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u => 
                u.Email.Contains(search) || 
                u.FirstName.Contains(search) || 
                u.LastName.Contains(search));
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(u => new
            {
                id = u.Id,
                firstName = u.FirstName,
                lastName = u.LastName,
                email = u.Email,
                role = u.Role,
                status = u.Status,
                isEmailVerified = u.IsEmailVerified,
                isTwoFactorEnabled = u.IsTwoFactorEnabled,
                lastLoginAt = u.LastLoginAt,
                createdAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            message = "Users retrieved",
            data = users,
            meta = new { total, page, limit, pages = (int)Math.Ceiling((double)total / limit) }
        });
    }

    [HttpPatch("users/{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateStatusRequest request)
    {
        var validStatuses = new[] { "ACTIVE", "SUSPENDED", "DELETED", "PENDING_VERIFICATION", "PENDING_APPROVAL" };

        if (string.IsNullOrEmpty(request.Status) || !validStatuses.Contains(request.Status.ToUpper()))
            return BadRequest(new { success = false, message = "Invalid status" });

        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        user.Status = request.Status.ToUpper();
        user.UpdatedAt = DateTime.UtcNow;

        if (user.Status == "SUSPENDED" || user.Status == "DELETED")
        {
            var tokens = await _db.RefreshTokens.Where(t => t.UserId == id && !t.Revoked).ToListAsync();
            foreach (var t in tokens) t.Revoked = true;
        }

        await _db.SaveChangesAsync();

        return Ok(new { success = true, message = "User status updated" });
    }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
