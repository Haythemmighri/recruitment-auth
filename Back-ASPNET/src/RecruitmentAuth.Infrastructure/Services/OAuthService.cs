using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecruitmentAuth.Application.DTOs.Auth;
using RecruitmentAuth.Application.Persistence;
using RecruitmentAuth.Application.Services;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.Infrastructure.Services;

public class OAuthService : IOAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;
    private readonly ILogger<OAuthService> _logger;
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly IEmailService _emailService;

    public OAuthService(
        IApplicationDbContext db,
        ITokenService tokenService,
        IConfiguration config,
        ILogger<OAuthService> logger,
        IHttpClientFactory httpFactory,
        IMemoryCache cache,
        IEmailService emailService)
    {
        _db = db;
        _tokenService = tokenService;
        _config = config;
        _logger = logger;
        _http = httpFactory.CreateClient();
        _cache = cache;
        _emailService = emailService;
    }

    // ─── Google ───────────────────────────────────────────────────────────────

    public async Task<LoginResult> HandleGoogleCallbackAsync(string code, string ipAddress, string? userAgent)
    {
        var clientId = _config["GOOGLE_CLIENT_ID"]!;
        var clientSecret = _config["GOOGLE_CLIENT_SECRET"]!;
        var redirectUri = $"{_config["APP_BASE_URL"]}/api/oauth/google/callback";

        // Exchange code for token
        var tokenRes = await _http.PostAsync("https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code"
            }));

        tokenRes.EnsureSuccessStatusCode();
        var tokenJson = JsonDocument.Parse(await tokenRes.Content.ReadAsStringAsync());
        var accessToken = tokenJson.RootElement.GetProperty("access_token").GetString()!;

        // Get user info
        var req = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var userRes = await _http.SendAsync(req);
        userRes.EnsureSuccessStatusCode();
        var userJson = JsonDocument.Parse(await userRes.Content.ReadAsStringAsync()).RootElement;

        var googleId = userJson.GetProperty("id").GetString()!;
        var email = userJson.GetProperty("email").GetString()!;
        var firstName = userJson.TryGetProperty("given_name", out var fn) ? fn.GetString()! : email;
        var lastName = userJson.TryGetProperty("family_name", out var ln) ? ln.GetString() : "";
        var avatar = userJson.TryGetProperty("picture", out var pic) ? pic.GetString() : null;

        var user = await FindOrCreateOAuthUserAsync(
            googleId, null, null, email, firstName, lastName!, avatar,
            u => u.GoogleId, (u, id) => u.GoogleId = id);

        await LogAuditAsync(user.Id, "OAUTH_GOOGLE_LOGIN", ipAddress, userAgent);
        return await TriggerOAuthVerificationAsync(user, ipAddress, userAgent);
    }

    // ─── GitHub ───────────────────────────────────────────────────────────────

    public async Task<LoginResult> HandleGithubCallbackAsync(string code, string ipAddress, string? userAgent)
    {
        var clientId = _config["GITHUB_CLIENT_ID"]!;
        var clientSecret = _config["GITHUB_CLIENT_SECRET"]!;

        // Exchange code for token
        var tokenReq = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token");
        tokenReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        tokenReq.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["code"] = code
        });

        var tokenRes = await _http.SendAsync(tokenReq);
        tokenRes.EnsureSuccessStatusCode();
        var tokenJson = JsonDocument.Parse(await tokenRes.Content.ReadAsStringAsync());
        var accessToken = tokenJson.RootElement.GetProperty("access_token").GetString()!;

        // Get user info
        var userReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
        userReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        userReq.Headers.UserAgent.ParseAdd("RecruitmentAuthApp");
        var userRes = await _http.SendAsync(userReq);
        userRes.EnsureSuccessStatusCode();
        var userJson = JsonDocument.Parse(await userRes.Content.ReadAsStringAsync()).RootElement;

        // Get primary email if not public
        string? email = userJson.TryGetProperty("email", out var em) ? em.GetString() : null;
        if (string.IsNullOrEmpty(email))
        {
            var emailReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
            emailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            emailReq.Headers.UserAgent.ParseAdd("RecruitmentAuthApp");
            var emailRes = await _http.SendAsync(emailReq);
            var emailsJson = JsonDocument.Parse(await emailRes.Content.ReadAsStringAsync()).RootElement;
            email = emailsJson.EnumerateArray()
                .FirstOrDefault(e => e.TryGetProperty("primary", out var p) && p.GetBoolean())
                .GetProperty("email").GetString();
        }

        var githubId = userJson.GetProperty("id").GetInt32().ToString();
        var nameParts = (userJson.TryGetProperty("name", out var n) ? n.GetString() : null)?.Split(' ', 2) ?? [];
        var firstName = nameParts.Length > 0 ? nameParts[0] : (email ?? githubId);
        var lastName = nameParts.Length > 1 ? nameParts[1] : "";
        var avatar = userJson.TryGetProperty("avatar_url", out var av) ? av.GetString() : null;

        var user = await FindOrCreateOAuthUserAsync(
            githubId, null, null, email!, firstName, lastName, avatar,
            u => u.GithubId, (u, id) => u.GithubId = id);

        await LogAuditAsync(user.Id, "OAUTH_GITHUB_LOGIN", ipAddress, userAgent);
        return await TriggerOAuthVerificationAsync(user, ipAddress, userAgent);
    }

    // ─── LinkedIn ─────────────────────────────────────────────────────────────

    public async Task<LoginResult> HandleLinkedinCallbackAsync(string code, string ipAddress, string? userAgent)
    {
        var clientId = _config["LINKEDIN_CLIENT_ID"]!;
        var clientSecret = _config["LINKEDIN_CLIENT_SECRET"]!;
        var redirectUri = $"{_config["APP_BASE_URL"]}/api/oauth/linkedin/callback";

        // Exchange code for token
        var tokenRes = await _http.PostAsync("https://www.linkedin.com/oauth/v2/accessToken",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri
            }));
        tokenRes.EnsureSuccessStatusCode();
        var tokenJson = JsonDocument.Parse(await tokenRes.Content.ReadAsStringAsync());
        var accessToken = tokenJson.RootElement.GetProperty("access_token").GetString()!;

        // Get user profile
        var profileReq = new HttpRequestMessage(HttpMethod.Get,
            "https://api.linkedin.com/v2/userinfo");
        profileReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var profileRes = await _http.SendAsync(profileReq);
        profileRes.EnsureSuccessStatusCode();
        var profile = JsonDocument.Parse(await profileRes.Content.ReadAsStringAsync()).RootElement;

        var linkedinId = profile.GetProperty("sub").GetString()!;
        var email = profile.GetProperty("email").GetString()!;
        var firstName = profile.TryGetProperty("given_name", out var gn) ? gn.GetString()! : email;
        var lastName = profile.TryGetProperty("family_name", out var ln) ? ln.GetString()! : "";
        var avatar = profile.TryGetProperty("picture", out var pic) ? pic.GetString() : null;

        var user = await FindOrCreateOAuthUserAsync(
            linkedinId, null, null, email, firstName, lastName, avatar,
            u => u.LinkedinId, (u, id) => u.LinkedinId = id);

        await LogAuditAsync(user.Id, "OAUTH_LINKEDIN_LOGIN", ipAddress, userAgent);
        return await TriggerOAuthVerificationAsync(user, ipAddress, userAgent);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task<User> FindOrCreateOAuthUserAsync(
        string oauthId,
        string? _unused1, string? _unused2,
        string email, string firstName, string lastName, string? avatar,
        Func<User, string?> getOauthId,
        Action<User, string> setOauthId)
    {
        // Find by oauth ID
        var user = await _db.Users.FirstOrDefaultAsync(u => getOauthId(u) == oauthId);

        if (user == null)
        {
            // Try to link by email
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        if (user == null)
        {
            // Create new user
            var now = DateTime.UtcNow;
            user = new User
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Role = "CANDIDATE",
                Status = "PENDING_APPROVAL",  // must be activated by admin before first login
                IsEmailVerified = true,
                IsTwoFactorEnabled = false,
                AvatarUrl = avatar,
                CreatedAt = now,
                UpdatedAt = now
            };
            setOauthId(user, oauthId);
            _db.Users.Add(user);
        }
        else
        {
            // Link account if not already linked
            if (string.IsNullOrEmpty(getOauthId(user)))
            {
                setOauthId(user, oauthId);
            }
            user.LastLoginAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            if (avatar != null && string.IsNullOrEmpty(user.AvatarUrl))
                user.AvatarUrl = avatar;
        }

        await _db.SaveChangesAsync();
        return user;
    }

    private async Task<LoginResult> TriggerOAuthVerificationAsync(User user, string ipAddress, string? userAgent)
    {

        if (user.Status == "SUSPENDED")
        {
            throw new UnauthorizedAccessException("Your account has been suspended. Contact support.");
        }

        if (user.Status != "ACTIVE")
        {
            throw new UnauthorizedAccessException("Account is not active.");
        }

        var tempToken = _tokenService.GenerateTempToken(user.Id);
        var code = new Random().Next(100000, 999999).ToString();

        _cache.Set($"auth:oauth:code:{user.Id}", code, TimeSpan.FromMinutes(5));

        await _emailService.SendOauthVerificationEmailAsync(user.Email, user.FirstName, code, tempToken);

        return new LoginResult
        {
            RequiresOauthVerification = true,
            TempToken = tempToken
        };
    }

    private async Task LogAuditAsync(string userId, string eventName, string ipAddress, string? userAgent)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Event = eventName,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }
}
