using JapaneseLearning.Application.Common.Dtos;
using JapaneseLearning.Application.Features.Vocabularies.Dtos;

namespace JapaneseLearning.Application.Features.Vocabularies;

public interface IVocabularyService
{
    Task<PagedResult<VocabularyDto>> GetByTopicIdAsync(
        Guid userId, Guid topicId, string? search, int page, int pageSize,
        CancellationToken cancellationToken = default);

    Task<PagedResult<VocabularyDto>> SearchAsync(
        Guid userId, string query, int page, int pageSize,
        CancellationToken cancellationToken = default);

    Task<CheckDuplicateResponse> CheckDuplicateAsync(
        Guid userId, CheckDuplicateRequest request,
        CancellationToken cancellationToken = default);

    Task<VocabularyDto> CreateAsync(
        Guid userId, CreateVocabularyRequest request,
        CancellationToken cancellationToken = default);

    Task<VocabularyDto> UpdateAsync(
        Guid userId, Guid id, UpdateVocabularyRequest request,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        Guid userId, Guid id,
        CancellationToken cancellationToken = default);
    
    Task<PracticePrepareResponse> PrepareAsync(
        Guid userId, PracticePrepareRequest request,
        CancellationToken cancellationToken = default);
}