namespace RecruitmentAuth.Application.Services;

/// <summary>
/// Responsible for sending transactional emails (verification, password reset, 2FA).
/// </summary>
public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string firstName, string token);
    Task SendPasswordResetEmailAsync(string toEmail, string firstName, string token);
    Task SendTwoFactorCodeEmailAsync(string toEmail, string firstName, string code);
    Task SendOauthVerificationEmailAsync(string toEmail, string firstName, string code, string tempToken);
}
