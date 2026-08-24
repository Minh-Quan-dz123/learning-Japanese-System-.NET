using JapaneseLearning.Application.Features.Auth;
using JapaneseLearning.Application.Features.Characters;
using JapaneseLearning.Application.Features.PracticeSessions;
using Microsoft.Extensions.DependencyInjection;

namespace JapaneseLearning.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICharacterService, CharacterService>();
        services.AddScoped<IPracticeSessionService, PracticeSessionService>();
        services.AddScoped<ICharacterStatsService, CharacterStatsService>();
        return services;
    }
}