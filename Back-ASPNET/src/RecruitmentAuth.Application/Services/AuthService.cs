using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using OtpNet;
using QRCoder;
using Microsoft.Extensions.Logging;
using RecruitmentAuth.Application.DTOs.Auth;
using RecruitmentAuth.Application.Persistence;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.Application.Services;

/// <summary>
/// Core authentication use-cases: register, login, 2FA, token refresh, logout,
/// email verification, and password management.
/// </summary>
public class AuthService : IAuthService
{
    // Injected via interface so Application does not depend on Infrastructure types directly.
    private readonly IApplicationDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;
    private readonly IMemoryCache _cache;

    private const int MaxLoginAttempts = 5;
    private const int LockoutMinutes = 15;

    public AuthService(
        IApplicationDbContext db,
        ITokenService tokenService,
        IEmailService emailService,
        IConfiguration config,
        ILogger<AuthService> logger,
        IMemoryCache cache)
    {
        _db = db;
        _tokenService = tokenService;
        _emailService = emailService;
        _config = config;
        _logger = logger;
        _cache = cache;
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, string ipAddress, string? userAgent)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already registered.");

        var userId = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;

        var validRoles = new[] { "CANDIDATE", "RECRUITER" };
        var role = validRoles.Contains(request.Role.ToUpper()) ? request.Role.ToUpper() : "CANDIDATE";

        var user = new User
        {
            Id = userId,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            Status = "PENDING_VERIFICATION",
            IsEmailVerified = false,
            IsTwoFactorEnabled = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Users.Add(user);

        var rawToken = _tokenService.GenerateRefreshToken();
        var tokenHash = _tokenService.HashToken(rawToken);

        _db.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = now.AddHours(24),
            Used = false,
            CreatedAt = now
        });

        await _db.SaveChangesAsync();

        _ = _emailService.SendVerificationEmailAsync(user.Email, user.FirstName, rawToken)
            .ContinueWith(t => _logger.LogError(t.Exception, "Verification email failed"),
                TaskContinuationOptions.OnlyOnFaulted);

        await LogAuditAsync(userId, "USER_REGISTERED", ipAddress, userAgent);

        return await IssueTokenPairAsync(user, ipAddress, userAgent);
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    public async Task<LoginResult> LoginAsync(LoginRequest request, string ipAddress, string? userAgent)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-LockoutMinutes);
        var recentFailures = await _db.LoginAttempts
            .CountAsync(a => a.Email == request.Email && a.IpAddress == ipAddress
                          && !a.Success && a.CreatedAt >= cutoff);

        if (recentFailures >= MaxLoginAttempts)
            throw new UnauthorizedAccessException("Too many failed login attempts. Please wait 15 minutes.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

        bool success = user != null
            && !string.IsNullOrEmpty(user.PasswordHash)
            && BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

        _db.LoginAttempts.Add(new LoginAttempt
        {
            Id = Guid.NewGuid().ToString(),
            UserId = user?.Id,
            Email = request.Email,
            IpAddress = ipAddress,
            Success = success,
            FailureReason = success ? null : (user == null ? "USER_NOT_FOUND" : "INVALID_PASSWORD"),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        if (!success)
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (user!.Status == "PENDING_APPROVAL")
            throw new UnauthorizedAccessException("Your account is pending admin approval.");

        if (user.Status == "SUSPENDED")
            throw new UnauthorizedAccessException("Your account has been suspended.");

        if (user.Status == "DELETED")
            throw new UnauthorizedAccessException("Account not found.");

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await LogAuditAsync(user.Id, "USER_LOGIN", ipAddress, userAgent);

        if (user.IsTwoFactorEnabled)
        {
            var tempToken = _tokenService.GenerateTempToken(user.Id);
            return new LoginResult { RequiresTwoFactor = true, TempToken = tempToken };
        }

        var authRes = await IssueTokenPairAsync(user, ipAddress, userAgent);
        return new LoginResult { RequiresTwoFactor = false, AuthResponse = authRes };
    }

    // ─── Two-Factor Authentication ────────────────────────────────────────────

    public async Task<AuthResponse> VerifyTwoFactorAsync(string tempToken, string totpCode,
        string ipAddress, string? userAgent)
    {
        var userId = _tokenService.VerifyTempToken(tempToken);
        if (userId == null)
            throw new UnauthorizedAccessException("Invalid or expired temporary token. Please log in again.");

        var user = await _db.Users.FindAsync(userId);
        if (user == null || !user.IsTwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecret))
            throw new InvalidOperationException("Two-factor authentication is not configured.");

        if (user.Status != "ACTIVE")
            throw new UnauthorizedAccessException("Account is not active.");

        var secretBytes = Base32Encoding.ToBytes(user.TwoFactorSecret);
        var totp = new Totp(secretBytes);
        if (!totp.VerifyTotp(totpCode, out long timeStepMatched, new VerificationWindow(2, 2)))
            throw new UnauthorizedAccessException("Invalid verification code. Please try again.");

        await LogAuditAsync(user.Id, "TWO_FACTOR_LOGIN", ipAddress, userAgent);
        return await IssueTokenPairAsync(user, ipAddress, userAgent);
    }

    public async Task<AuthResponse> VerifyOauthCodeAsync(string tempToken, string code,
        string ipAddress, string? userAgent)
    {
        var userId = _tokenService.VerifyTempToken(tempToken);
        if (userId == null)
            throw new UnauthorizedAccessException("Invalid or expired temporary token. Please log in again.");

        var cacheKey = $"auth:oauth:code:{userId}";
        if (!_cache.TryGetValue(cacheKey, out string? cachedCode))
            throw new UnauthorizedAccessException("Verification session expired. Please log in again.");

        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User not found.");

        if (code != cachedCode)
            throw new UnauthorizedAccessException("Invalid verification code. Please try again.");

        if (user.Status == "PENDING_APPROVAL")
        {
            _cache.Remove(cacheKey);
            throw new UnauthorizedAccessException("Email verified successfully. Your account is pending activation by an administrator. You will be notified once approved.");
        }

        if (user.Status != "ACTIVE")
            throw new UnauthorizedAccessException("Account is not active.");

        _cache.Remove(cacheKey);

        await LogAuditAsync(user.Id, "OAUTH_LOGIN_VERIFIED", ipAddress, userAgent);
        return await IssueTokenPairAsync(user, ipAddress, userAgent);
    }

    public async Task<object> SetupTwoFactorAsync(string userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.IsTwoFactorEnabled)
            throw new InvalidOperationException("Two-factor authentication is already enabled.");

        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);

        _cache.Set($"auth:2fa:setup:{userId}", base32Secret, TimeSpan.FromMinutes(10));

        var issuer = "RecruitAuth";
        var account = Uri.EscapeDataString(user.Email);
        var qrCodeUrl = $"otpauth://totp/{issuer}:{account}?secret={base32Secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";

        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(qrCodeUrl, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new SvgQRCode(qrCodeData);
        var svgText = qrCode.GetGraphic(20);
        var base64Svg = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(svgText));
        var qrCodeDataUrl = $"data:image/svg+xml;base64,{base64Svg}";

        return new { 
            qrCodeDataUrl = qrCodeDataUrl,
            secret = base32Secret
        };
    }

    public async Task<object> EnableTwoFactorAsync(string userId, string totpCode)
    {
        var cacheKey = $"auth:2fa:setup:{userId}";
        if (!_cache.TryGetValue(cacheKey, out string? pendingSecret))
            throw new UnauthorizedAccessException("Two-factor setup session expired. Please restart setup.");

        var secretBytes = Base32Encoding.ToBytes(pendingSecret);
        var totp = new Totp(secretBytes);
        if (!totp.VerifyTotp(totpCode, out long timeStepMatched, new VerificationWindow(2, 2)))
            throw new UnauthorizedAccessException("Invalid verification code. Please try again.");

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.IsTwoFactorEnabled = true;
            user.TwoFactorSecret = pendingSecret;
            await _db.SaveChangesAsync();
        }

        _cache.Remove(cacheKey);
        await LogAuditAsync(userId, "TWO_FACTOR_ENABLED", null, null);
        return new { message = "Two-factor authentication enabled successfully." };
    }

    public async Task<object> DisableTwoFactorAsync(string userId, string password)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!user.IsTwoFactorEnabled)
            throw new InvalidOperationException("Two-factor authentication is not enabled.");

        if (string.IsNullOrEmpty(user.PasswordHash))
            throw new InvalidOperationException("Password-based authentication is not available for this account.");

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new UnauthorizedAccessException("Incorrect password.");

        user.IsTwoFactorEnabled = false;
        user.TwoFactorSecret = null;
        await _db.SaveChangesAsync();

        await LogAuditAsync(userId, "TWO_FACTOR_DISABLED", null, null);
        return new { message = "Two-factor authentication disabled successfully." };
    }

    // ─── Refresh Token ────────────────────────────────────────────────────────

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, string ipAddress, string? userAgent)
    {
        var tokenHash = _tokenService.HashToken(refreshToken);

        var storedToken = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (storedToken == null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        if (storedToken.Revoked)
        {
            await RevokeTokenFamilyAsync(storedToken.Family);
            throw new UnauthorizedAccessException("Refresh token reuse detected. Please log in again.");
        }

        if (storedToken.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token has expired.");

        storedToken.Revoked = true;
        await _db.SaveChangesAsync();

        await LogAuditAsync(storedToken.UserId, "TOKEN_REFRESHED", ipAddress, userAgent);
        return await IssueTokenPairAsync(storedToken.User, ipAddress, userAgent, storedToken.Family);
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    public async Task LogoutAsync(string refreshToken)
    {
        var tokenHash = _tokenService.HashToken(refreshToken);
        var storedToken = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (storedToken != null)
        {
            storedToken.Revoked = true;
            await _db.SaveChangesAsync();
            await LogAuditAsync(storedToken.UserId, "USER_LOGOUT", null, null);
        }
    }

    // ─── Verify Email ─────────────────────────────────────────────────────────

    public async Task<bool> VerifyEmailAsync(string token)
    {
        var tokenHash = _tokenService.HashToken(token);

        var verifyToken = await _db.EmailVerificationTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (verifyToken == null || verifyToken.Used || verifyToken.ExpiresAt < DateTime.UtcNow)
            return false;

        verifyToken.Used = true;
        verifyToken.User.IsEmailVerified = true;
        verifyToken.User.Status = "PENDING_APPROVAL";
        verifyToken.User.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await LogAuditAsync(verifyToken.UserId, "EMAIL_VERIFIED", null, null);
        return true;
    }

    // ─── Forgot / Reset Password ──────────────────────────────────────────────

    public async Task ForgotPasswordAsync(string email, string ipAddress)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return;

        var now = DateTime.UtcNow;
        var rawToken = _tokenService.GenerateRefreshToken();
        var tokenHash = _tokenService.HashToken(rawToken);

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid().ToString(),
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = now.AddHours(1),
            Used = false,
            CreatedAt = now
        });

        await _db.SaveChangesAsync();

        _ = _emailService.SendPasswordResetEmailAsync(user.Email, user.FirstName, rawToken)
            .ContinueWith(t => _logger.LogError(t.Exception, "Password reset email failed"),
                TaskContinuationOptions.OnlyOnFaulted);

        await LogAuditAsync(user.Id, "PASSWORD_RESET_REQUESTED", ipAddress, null);
    }

    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        var tokenHash = _tokenService.HashToken(token);

        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (resetToken == null || resetToken.Used || resetToken.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Invalid or expired password reset token.");

        resetToken.Used = true;
        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        resetToken.User.UpdatedAt = DateTime.UtcNow;

        var userTokens = await _db.RefreshTokens
            .Where(t => t.UserId == resetToken.UserId && !t.Revoked)
            .ToListAsync();
        foreach (var t in userTokens) t.Revoked = true;

        await _db.SaveChangesAsync();
        await LogAuditAsync(resetToken.UserId, "PASSWORD_RESET", null, null);
    }

    // ─── Get Current User ─────────────────────────────────────────────────────

    public async Task<UserDto> GetCurrentUserAsync(string userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        return MapToDto(user);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private async Task<AuthResponse> IssueTokenPairAsync(
        User user, string ipAddress, string? userAgent, string? existingFamily = null)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();
        var refreshHash = _tokenService.HashToken(rawRefreshToken);

        var expiresInStr = _config["JWT_REFRESH_EXPIRES_IN"] ?? "7d";
        var expiresIn = ParseDuration(expiresInStr);

        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid().ToString(),
            UserId = user.Id,
            TokenHash = refreshHash,
            Family = existingFamily ?? Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.Add(expiresIn),
            Revoked = false,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = rawRefreshToken,
            User = MapToDto(user)
        };
    }

    private async Task RevokeTokenFamilyAsync(string family)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.Family == family && !t.Revoked)
            .ToListAsync();
        foreach (var t in tokens) t.Revoked = true;
        await _db.SaveChangesAsync();
    }

    private async Task LogAuditAsync(string? userId, string eventName, string? ipAddress, string? userAgent)
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

    private static TimeSpan ParseDuration(string duration)
    {
        if (duration.EndsWith('d')) return TimeSpan.FromDays(int.Parse(duration[..^1]));
        if (duration.EndsWith('h')) return TimeSpan.FromHours(int.Parse(duration[..^1]));
        if (duration.EndsWith('m')) return TimeSpan.FromMinutes(int.Parse(duration[..^1]));
        return TimeSpan.FromDays(7);
    }
}
