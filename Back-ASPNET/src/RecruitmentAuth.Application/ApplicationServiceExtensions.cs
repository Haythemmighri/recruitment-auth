using Microsoft.Extensions.DependencyInjection;
using RecruitmentAuth.Application.Services;

namespace RecruitmentAuth.Application;

public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
