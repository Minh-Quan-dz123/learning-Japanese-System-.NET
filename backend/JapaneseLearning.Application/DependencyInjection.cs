using JapaneseLearning.Application.Features.Auth;
using JapaneseLearning.Application.Features.Characters;
using JapaneseLearning.Application.Features.PracticeSessions;
using JapaneseLearning.Application.Features.Topics;
using JapaneseLearning.Application.Features.Vocabularies;   // <-- MỚI THÊM
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
        services.AddScoped<ITopicService, TopicService>();
        services.AddScoped<IVocabularyService, VocabularyService>();   // <-- MỚI THÊM
        return services;
    }
}