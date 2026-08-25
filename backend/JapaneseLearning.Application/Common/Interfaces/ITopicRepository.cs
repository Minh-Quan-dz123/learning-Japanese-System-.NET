using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Common.Interfaces;

/// <summary>
/// Số liệu tính động của 1 topic, gom từ bảng Vocabularies.
/// Không phải Entity — chỉ là "gói dữ liệu" tạm để Repository trả về cho Service.
/// </summary>
public record TopicStats(int WordCount, DateTime? LastModifiedAt);

public interface ITopicRepository
{
    Task<Topic?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<List<Topic>> GetAllByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Tính wordCount + lastModifiedAt cho nhiều topic cùng lúc (1 query GROUP BY),
    /// tránh N+1 query khi hiển thị danh sách topic.
    /// Topic nào không có trong dictionary trả về nghĩa là chưa có từ nào (wordCount = 0, lastModifiedAt = null).
    /// </summary>
    Task<IReadOnlyDictionary<Guid, TopicStats>> GetStatsByTopicIdsAsync(
        IEnumerable<Guid> topicIds,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check trùng tên trong cùng 1 user (trim + lowercase, tự làm trong Repository qua LINQ,
    /// khớp đúng functional unique index LOWER(TRIM(name)) ở DB).
    /// excludeTopicId dùng khi Update — loại chính topic đang sửa ra khỏi việc so sánh.
    /// </summary>
    Task<bool> ExistsByNameAsync(
        Guid userId,
        string name,
        Guid? excludeTopicId = null,
        CancellationToken cancellationToken = default);

    Task AddAsync(Topic topic, CancellationToken cancellationToken = default);

    void Update(Topic topic);

    void Delete(Topic topic);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}