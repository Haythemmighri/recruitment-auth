using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecruitmentAuth.Application.Services;

namespace RecruitmentAuth.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string firstName, string token)
    {
        var baseUrl = _config["APP_BASE_URL"] ?? "http://localhost:5000";
        var verifyUrl = $"{baseUrl}/api/auth/verify-email?token={Uri.EscapeDataString(token)}";

        var body = $"""
            <h2>Welcome, {firstName}!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <p><a href="{verifyUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
            <p>This link expires in 24 hours.</p>
            <p>If you did not create an account, you can ignore this email.</p>
            """;

        await SendEmailAsync(toEmail, "Verify your email address", body);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string firstName, string token)
    {
        var clientUrl = _config["CLIENT_URL"] ?? "http://localhost:4200";
        var resetUrl = $"{clientUrl}/#/reset-password?token={Uri.EscapeDataString(token)}";

        var body = $"""
            <h2>Hi, {firstName}!</h2>
            <p>You requested a password reset. Click below to set a new password:</p>
            <p><a href="{resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you did not request a password reset, you can ignore this email.</p>
            """;

        await SendEmailAsync(toEmail, "Reset your password", body);
    }

    public async Task SendTwoFactorCodeEmailAsync(string toEmail, string firstName, string code)
    {
        var body = $"""
            <h2>Hi, {firstName}!</h2>
            <p>Here is your 6-digit verification code:</p>
            <h1 style="background:#f3f4f6;padding:16px;text-align:center;letter-spacing:4px;border-radius:6px;">{code}</h1>
            <p>This code expires in 5 minutes.</p>
            <p>If you did not request this, please secure your account immediately.</p>
            """;

        await SendEmailAsync(toEmail, "Your Two-Factor Verification Code", body);
    }

    public async Task SendOauthVerificationEmailAsync(string toEmail, string firstName, string code, string tempToken)
    {
        var clientUrl = _config["CLIENT_URL"] ?? "http://localhost:4200";
        var verifyUrl = $"{clientUrl}/#/auth/oauth/verify?tempToken={Uri.EscapeDataString(tempToken)}&code={code}";

        var body = $"""
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.05); text-align: center;">
                <h2 style="color: #333; margin-bottom: 8px;">Hi, {firstName}!</h2>
                <p style="color: #666; font-size: 15px; margin-bottom: 24px;">
                    Please enter the code below to complete your login.
                </p>
                <div style="background: linear-gradient(135deg, #00c6ff, #0072ff); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                    <h1 style="color: #fff; font-size: 42px; font-weight: 700; letter-spacing: 8px; margin: 0;">
                        {code}
                    </h1>
                </div>
                <a href="{verifyUrl}" style="display: inline-block; background: #333; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
                    Verify Automatically
                </a>
                <p style="color: #999; font-size: 13px; border-top: 1px solid #eee; padding-top: 16px; margin: 0;">
                    This code expires in <strong>5 minutes</strong>.<br>
                    If you didn't request this login, please secure your account.
                </p>
            </div>
            """;

        await SendEmailAsync(toEmail, "Complete your login", body);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var host = _config["EMAIL_HOST"] ?? "smtp.gmail.com";
        var port = int.Parse(_config["EMAIL_PORT"] ?? "587");
        var user = _config["EMAIL_USER"] ?? "";
        var pass = _config["EMAIL_PASS"] ?? "";
        var from = _config["EMAIL_FROM"] ?? user;

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(user, pass),
            EnableSsl = true
        };

        var mail = new MailMessage(from, toEmail, subject, htmlBody)
        {
            IsBodyHtml = true
        };

        try
        {
            await client.SendMailAsync(mail);
            _logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw;
        }
    }
}
