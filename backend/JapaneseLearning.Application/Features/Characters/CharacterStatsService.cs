using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Features.Characters.Dtos;

namespace JapaneseLearning.Application.Features.Characters;

public class CharacterStatsService : ICharacterStatsService
{
    private readonly IPracticeSessionRepository _repository;

    public CharacterStatsService(IPracticeSessionRepository repository)
    {
        _repository = repository;
    }

    // Logic GROUP BY + loại character đã xóa nằm ở Repository (Bước 3),
    // vì đây là truy vấn chạy trực tiếp trên DB, Service chỉ gọi lại
    public Task<IReadOnlyList<CharacterStatDto>> GetStatsForUserAsync(
        Guid userId, CancellationToken cancellationToken = default)
        => _repository.GetWrongRateStatsAsync(userId, cancellationToken);
}