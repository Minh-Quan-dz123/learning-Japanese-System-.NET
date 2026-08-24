using JapaneseLearning.Domain.Entities;
using JapaneseLearning.Application.Features.Characters.Dtos;

namespace JapaneseLearning.Application.Common.Interfaces;

public interface IPracticeSessionRepository
{
    // Tách riêng session và answers vì Entity không có navigation property giữa 2 bảng
    Task AddSessionAsync(PracticeSession session, CancellationToken cancellationToken = default);
    Task AddAnswersAsync(IEnumerable<PracticeAnswer> answers, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    Task<PracticeSession?> GetSessionByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<PracticeAnswer>> GetAnswersBySessionIdAsync(Guid sessionId, CancellationToken cancellationToken = default);

    Task<(List<PracticeSession> Items, int TotalCount)> GetByUserIdAsync(
        Guid userId, int page, int pageSize, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CharacterStatDto>> GetWrongRateStatsAsync(Guid userId, CancellationToken cancellationToken = default);
}