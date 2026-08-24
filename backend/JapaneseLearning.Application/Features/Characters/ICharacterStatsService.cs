using JapaneseLearning.Application.Features.Characters.Dtos;

namespace JapaneseLearning.Application.Features.Characters;

public interface ICharacterStatsService
{
    Task<IReadOnlyList<CharacterStatDto>> GetStatsForUserAsync(
        Guid userId, CancellationToken cancellationToken = default);
}