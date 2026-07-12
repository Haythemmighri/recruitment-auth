using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecruitmentAuth.API.Helpers;
using RecruitmentAuth.Application.DTOs.Auth;
using RecruitmentAuth.Application.Services;

namespace RecruitmentAuth.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    private const string RefreshTokenCookie = "refresh_token";

    public AuthController(IAuthService authService, IConfiguration config, ILogger<AuthController> logger)
    {
        _authService = authService;
        _config = config;
        _logger = logger;
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private string? GetUserAgent() =>
        Request.Headers.UserAgent.ToString();

    private string? GetRefreshToken(string? fromBody = null)
    {
        return Request.Cookies[RefreshTokenCookie]
            ?? fromBody;
    }

    private void SetRefreshTokenCookie(string token)
    {
        var expiresInStr = _config["JWT_REFRESH_EXPIRES_IN"] ?? "7d";
        var days = int.TryParse(expiresInStr.TrimEnd('d'), out var d) ? d : 7;

        Response.Cookies.Append(RefreshTokenCookie, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = false, // Set to true in production with HTTPS
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(days),
            Path = "/"
        });
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
    }

    [HttpGet("csrf-token")]
    public IActionResult GetCsrfToken()
    {
        return Ok(new { success = true, data = new { csrfToken = "" } });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, errors = ModelState });

        try
        {
            var result = await _authService.RegisterAsync(request, GetIpAddress(), GetUserAgent());
            SetRefreshTokenCookie(result.RefreshToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "Registration successful. Please verify your email."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Register error");
            return StatusCode(500, new { success = false, message = "An error occurred during registration." });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, errors = ModelState });

        try
        {
            var result = await _authService.LoginAsync(request, GetIpAddress(), GetUserAgent());
            
            if (result.RequiresTwoFactor)
            {
                return Ok(new { success = true, data = new { requiresTwoFactor = true, tempToken = result.TempToken }, message = "Two-factor authentication required" });
            }

            SetRefreshTokenCookie(result.AuthResponse!.RefreshToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result.AuthResponse, "Login successful."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login error");
            return StatusCode(500, new { success = false, message = "An error occurred during login." });
        }
    }

    [HttpPost("2fa/verify")]
    public async Task<IActionResult> VerifyTwoFactor([FromBody] TwoFactorVerifyRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, errors = ModelState });

        try
        {
            var result = await _authService.VerifyTwoFactorAsync(request.TempToken, request.TotpCode, GetIpAddress(), GetUserAgent());
            SetRefreshTokenCookie(result.RefreshToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "2FA verification successful."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "2FA verify error");
            return StatusCode(500, new { success = false, message = "An error occurred during verification." });
        }
    }

    [HttpPost("oauth/verify-code")]
    public async Task<IActionResult> VerifyOauthCode([FromBody] OauthVerifyRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, errors = ModelState });

        try
        {
            var result = await _authService.VerifyOauthCodeAsync(request.TempToken, request.Code, GetIpAddress(), GetUserAgent());
            SetRefreshTokenCookie(result.RefreshToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "OAuth verification successful."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OAuth verify error");
            return StatusCode(500, new { success = false, message = "An error occurred during verification." });
        }
    }

    [Authorize]
    [HttpPost("2fa/setup")]
    public async Task<IActionResult> SetupTwoFactor()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var result = await _authService.SetupTwoFactorAsync(userId);
            return Ok(new { success = true, data = result, message = "Setup initiated." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "2FA setup error");
            return StatusCode(500, new { success = false, message = "An error occurred." });
        }
    }

    [Authorize]
    [HttpPost("2fa/enable")]
    public async Task<IActionResult> EnableTwoFactor([FromBody] TwoFactorEnableRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var result = await _authService.EnableTwoFactorAsync(userId, request.TotpCode);
            return Ok(new { success = true, data = result, message = "Two-factor authentication enabled." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "2FA enable error");
            return StatusCode(500, new { success = false, message = "An error occurred." });
        }
    }

    [Authorize]
    [HttpPost("2fa/disable")]
    public async Task<IActionResult> DisableTwoFactor([FromBody] TwoFactorDisableRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var result = await _authService.DisableTwoFactorAsync(userId, request.Password);
            return Ok(new { success = true, data = result, message = "Two-factor authentication disabled." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "2FA disable error");
            return StatusCode(500, new { success = false, message = "An error occurred." });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest? request = null)
    {
        var refreshToken = GetRefreshToken(request?.RefreshToken);
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { success = false, message = "Refresh token is required." });

        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken, GetIpAddress(), GetUserAgent());
            SetRefreshTokenCookie(result.RefreshToken);
            return Ok(ApiResponse<AuthResponse>.Ok(result, "Token refreshed."));
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearRefreshTokenCookie();
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Refresh error");
            return StatusCode(500, new { success = false, message = "An error occurred." });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request = null)
    {
        var refreshToken = GetRefreshToken(request?.RefreshToken);
        try
        {
            if (!string.IsNullOrEmpty(refreshToken))
                await _authService.LogoutAsync(refreshToken);

            ClearRefreshTokenCookie();
            return Ok(new { success = true, message = "Logged out successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Logout error");
            ClearRefreshTokenCookie();
            return Ok(new { success = true, message = "Logged out." });
        }
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        if (string.IsNullOrEmpty(token))
            return BadRequest(new { success = false, message = "Token is required." });

        var verified = await _authService.VerifyEmailAsync(token);
        if (!verified)
            return BadRequest(new { success = false, message = "Invalid or expired verification token." });

        var acceptHeader = Request.Headers.Accept.ToString();
        if (acceptHeader.Contains("text/html"))
        {
            var clientUrl = _config["CLIENT_URL"] ?? "http://localhost:4200";
            return Redirect($"{clientUrl}/auth/login?verified=true");
        }

        return Ok(new { success = true, message = "Email verified successfully." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, errors = ModelState });

        await _authService.ForgotPasswordAsync(request.Email, GetIpAddress());
        return Ok(new { success = true, message = "If that email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, errors = ModelState });

        try
        {
            await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
            return Ok(new { success = true, message = "Password reset successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reset password error");
            return StatusCode(500, new { success = false, message = "An error occurred." });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Not authenticated." });

        try
        {
            var user = await _authService.GetCurrentUserAsync(userId);
            return Ok(ApiResponse<UserDto>.Ok(user));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, message = "User not found." });
        }
    }
}
