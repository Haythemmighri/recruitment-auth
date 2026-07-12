using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecruitmentAuth.API.Helpers;
using RecruitmentAuth.Application.DTOs.Auth;
using RecruitmentAuth.Application.Services;

namespace RecruitmentAuth.API.Controllers;

[ApiController]
[Route("api/oauth")]
public class OAuthController : ControllerBase
{
    private readonly IOAuthService _oauthService;
    private readonly IConfiguration _config;
    private readonly ILogger<OAuthController> _logger;

    public OAuthController(IOAuthService oauthService, IConfiguration config, ILogger<OAuthController> logger)
    {
        _oauthService = oauthService;
        _config = config;
        _logger = logger;
    }

    private string GetIpAddress() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private string? GetUserAgent() => Request.Headers.UserAgent.ToString();

    // ─── Google OAuth ──────────────────────────────────────────────────────────

    [HttpGet("google")]
    public IActionResult GoogleRedirect()
    {
        var clientId = _config["GOOGLE_CLIENT_ID"]!;
        var redirectUri = Uri.EscapeDataString($"{_config["APP_BASE_URL"]}/api/oauth/google/callback");
        var scope = Uri.EscapeDataString("openid email profile");
        var url = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={redirectUri}&response_type=code&scope={scope}&access_type=offline";
        return Redirect(url);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? error)
    {
        var clientUrl = _config["CLIENT_URL"] ?? "http://localhost:4200";

        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
            return Redirect($"{clientUrl}/auth/oauth-error?provider=google&error={error}");

        try
        {
            var result = await _oauthService.HandleGoogleCallbackAsync(code, GetIpAddress(), GetUserAgent());
            var redirectUrl = BuildOAuthSuccessRedirect(clientUrl, result);
            return Redirect(redirectUrl);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Redirect($"{clientUrl}/#/auth/login?error={Uri.EscapeDataString(ex.Message)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google OAuth callback failed");
            return Redirect($"{clientUrl}/#/auth/login?error=google_auth_failed");
        }
    }

    // ─── GitHub OAuth ─────────────────────────────────────────────────────────

    [HttpGet("github")]
    public IActionResult GitHubRedirect()
    {
        var clientId = _config["GITHUB_CLIENT_ID"]!;
        var redirectUri = Uri.EscapeDataString($"{_config["APP_BASE_URL"]}/api/oauth/github/callback");
        var url = $"https://github.com/login/oauth/authorize?client_id={clientId}&redirect_uri={redirectUri}&scope=user:email";
        return Redirect(url);
    }

    [HttpGet("github/callback")]
    public async Task<IActionResult> GitHubCallback([FromQuery] string? code, [FromQuery] string? error)
    {
        var clientUrl = _config["CLIENT_URL"] ?? "http://localhost:4200";

        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
            return Redirect($"{clientUrl}/auth/oauth-error?provider=github&error={error}");

        try
        {
            var result = await _oauthService.HandleGithubCallbackAsync(code, GetIpAddress(), GetUserAgent());
            var redirectUrl = BuildOAuthSuccessRedirect(clientUrl, result);
            return Redirect(redirectUrl);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Redirect($"{clientUrl}/#/auth/login?error={Uri.EscapeDataString(ex.Message)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GitHub OAuth callback failed");
            return Redirect($"{clientUrl}/#/auth/login?error=github_auth_failed");
        }
    }

    // ─── LinkedIn OAuth ───────────────────────────────────────────────────────

    [HttpGet("linkedin")]
    public IActionResult LinkedInRedirect()
    {
        var clientId = _config["LINKEDIN_CLIENT_ID"]!;
        var redirectUri = Uri.EscapeDataString($"{_config["APP_BASE_URL"]}/api/oauth/linkedin/callback");
        var scope = Uri.EscapeDataString("openid profile email");
        var url = $"https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={clientId}&redirect_uri={redirectUri}&scope={scope}";
        return Redirect(url);
    }

    [HttpGet("linkedin/callback")]
    public async Task<IActionResult> LinkedInCallback([FromQuery] string? code, [FromQuery] string? error)
    {
        var clientUrl = _config["CLIENT_URL"] ?? "http://localhost:4200";

        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
            return Redirect($"{clientUrl}/auth/oauth-error?provider=linkedin&error={error}");

        try
        {
            var result = await _oauthService.HandleLinkedinCallbackAsync(code, GetIpAddress(), GetUserAgent());
            var redirectUrl = BuildOAuthSuccessRedirect(clientUrl, result);
            return Redirect(redirectUrl);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Redirect($"{clientUrl}/#/auth/login?error={Uri.EscapeDataString(ex.Message)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LinkedIn OAuth callback failed");
            return Redirect($"{clientUrl}/#/auth/login?error=linkedin_auth_failed");
        }
    }

    // ─── Internal API endpoints (for SPA that handles OAuth itself) ───────────

    [HttpPost("google/token")]
    public async Task<IActionResult> GoogleToken([FromBody] OAuthCodeRequest request)
    {
        try
        {
            var result = await _oauthService.HandleGoogleCallbackAsync(request.Code, GetIpAddress(), GetUserAgent());
            
            if (result.RequiresOauthVerification)
            {
                return Ok(new { success = true, data = new { requiresOauthVerification = true, tempToken = result.TempToken }, message = "OAuth verification required" });
            }
            
            return Ok(ApiResponse<AuthResponse>.Ok(result.AuthResponse!, "Google login successful."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google token exchange failed");
            return BadRequest(new { success = false, message = "Google authentication failed." });
        }
    }

    [HttpPost("github/token")]
    public async Task<IActionResult> GitHubToken([FromBody] OAuthCodeRequest request)
    {
        try
        {
            var result = await _oauthService.HandleGithubCallbackAsync(request.Code, GetIpAddress(), GetUserAgent());
            
            if (result.RequiresOauthVerification)
            {
                return Ok(new { success = true, data = new { requiresOauthVerification = true, tempToken = result.TempToken }, message = "OAuth verification required" });
            }

            return Ok(ApiResponse<AuthResponse>.Ok(result.AuthResponse!, "GitHub login successful."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GitHub token exchange failed");
            return BadRequest(new { success = false, message = "GitHub authentication failed." });
        }
    }

    [HttpPost("linkedin/token")]
    public async Task<IActionResult> LinkedInToken([FromBody] OAuthCodeRequest request)
    {
        try
        {
            var result = await _oauthService.HandleLinkedinCallbackAsync(request.Code, GetIpAddress(), GetUserAgent());
            
            if (result.RequiresOauthVerification)
            {
                return Ok(new { success = true, data = new { requiresOauthVerification = true, tempToken = result.TempToken }, message = "OAuth verification required" });
            }

            return Ok(ApiResponse<AuthResponse>.Ok(result.AuthResponse!, "LinkedIn login successful."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LinkedIn token exchange failed");
            return BadRequest(new { success = false, message = "LinkedIn authentication failed." });
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private static string BuildOAuthSuccessRedirect(string clientUrl, LoginResult result)
    {
        if (result.RequiresOauthVerification)
        {
            var tempToken = Uri.EscapeDataString(result.TempToken!);
            return $"{clientUrl}/#/auth/oauth/verify?tempToken={tempToken}";
        }
        else
        {
            var accessToken = Uri.EscapeDataString(result.AuthResponse!.AccessToken);
            var refreshToken = Uri.EscapeDataString(result.AuthResponse!.RefreshToken);
            return $"{clientUrl}/auth/oauth-success?access_token={accessToken}&refresh_token={refreshToken}";
        }
    }
}

public class OAuthCodeRequest
{
    public string Code { get; set; } = string.Empty;
    public string? RedirectUri { get; set; }
}
