using Microsoft.EntityFrameworkCore;
using RecruitmentAuth.Domain.Entities;

namespace RecruitmentAuth.Application.Persistence;

/// <summary>
/// Abstraction over the database context so the Application layer
/// does not directly reference EF Core (Infrastructure concern).
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<EmailVerificationToken> EmailVerificationTokens { get; }
    DbSet<PasswordResetToken> PasswordResetTokens { get; }
    DbSet<LoginAttempt> LoginAttempts { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
