using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Common.Interfaces;

public interface IVocabularyRepository
{
    Task<Vocabulary?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy danh sách từ trong 1 topic, có tìm kiếm (search) và phân trang.
    /// Repository chỉ query thô theo topicId — KHÔNG check topic đó có phải của user hay không
    /// (IDOR check đặt ở Service, theo đúng quyết định 2026-08-25).
    /// </summary>
    Task<(List<Vocabulary> Items, int TotalCount)> GetByTopicIdAsync(
        Guid topicId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tìm kiếm từ trên TOÀN BỘ các topic của 1 user (route GET /api/vocabularies/search).
    /// </summary>
    Task<(List<Vocabulary> Items, int TotalCount)> SearchByUserIdAsync(
        Guid userId,
        string query,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lấy tập ứng viên trùng romaji (đã trim+lowercase) trong toàn bộ topic của 1 user.
    /// Đây là bước lọc "thô" bằng index trước; việc so overlap "meaning" làm ở tầng Service
    /// bằng MeaningParser sau khi có tập ứng viên nhỏ này (xem erd.md mục 3.7).
    /// </summary>
    Task<List<Vocabulary>> FindByRomajiAsync(
        Guid userId,
        string romaji,
        CancellationToken cancellationToken = default);

    Task AddAsync(Vocabulary vocabulary, CancellationToken cancellationToken = default);    
    void Update(Vocabulary vocabulary);
    void Delete(Vocabulary vocabulary);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<List<Vocabulary>> GetByTopicIdsAsync(
        IEnumerable<Guid> topicIds,
        CancellationToken cancellationToken = default);
}