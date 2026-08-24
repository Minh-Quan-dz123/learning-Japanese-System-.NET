using JapaneseLearning.Application.Common.Dtos;
using JapaneseLearning.Application.Features.PracticeSessions.Dtos;

namespace JapaneseLearning.Application.Features.PracticeSessions;

public interface IPracticeSessionService
{
    Task<PracticeSessionResultDto> SubmitAsync(
        Guid userId, SubmitPracticeSessionRequest request, CancellationToken cancellationToken = default);

    Task<PagedResult<PracticeSessionSummaryDto>> GetMyHistoryAsync(
        Guid userId, int page, int pageSize, CancellationToken cancellationToken = default);

    Task<PracticeSessionDetailDto> GetDetailAsync(
        Guid userId, Guid sessionId, CancellationToken cancellationToken = default);
}