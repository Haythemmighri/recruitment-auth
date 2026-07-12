using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RecruitmentAuth.Application.Persistence;
using RecruitmentAuth.Application.Services;
using RecruitmentAuth.Infrastructure.Persistence;
using RecruitmentAuth.Infrastructure.Services;

namespace RecruitmentAuth.Infrastructure;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration config)
    {
        // ─── Database ─────────────────────────────────────────────────────────────
        var connStr = config["DATABASE_URL"]
            ?? "Server=localhost;Port=3306;Database=recruitment_auth;Uid=root;Pwd=;";

        if (connStr.StartsWith("mysql://"))
        {
            var uri = new Uri(connStr);
            var userInfo = uri.UserInfo.Split(':');
            var user = userInfo[0];
            var pass = userInfo.Length > 1 ? userInfo[1] : "";
            connStr = $"Server={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Uid={user};Pwd={pass};";
        }

        var serverVersion = new MySqlServerVersion(new Version(8, 0));
        services.AddDbContext<RecruitmentAuthContext>(options =>
            options.UseMySql(connStr, serverVersion));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<RecruitmentAuthContext>());

        // ─── Services ─────────────────────────────────────────────────────────────
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IOAuthService, OAuthService>();
        
        services.AddHttpClient();

        return services;
    }
}
