using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Infrastructure.Persistence.Repositories;
using JapaneseLearning.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JapaneseLearning.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));

        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<ITokenHasher, Sha256TokenHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<ICharacterRepository, CharacterRepository>();
        services.AddScoped<IPracticeSessionRepository, PracticeSessionRepository>();
        services.AddScoped<ITopicRepository, TopicRepository>();
        services.AddScoped<IVocabularyRepository, VocabularyRepository>();   // <-- MỚI THÊM

        return services;
    }
}