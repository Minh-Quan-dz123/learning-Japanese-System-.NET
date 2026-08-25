using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Domain.Entities;
using JapaneseLearning.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JapaneseLearning.Infrastructure.Persistence.Repositories;

public class TopicRepository : ITopicRepository
{
    private readonly AppDbContext _db;

    public TopicRepository(AppDbContext db) => _db = db;

    public Task<Topic?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Topics.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task<List<Topic>> GetAllByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.Topics.Where(t => t.UserId == userId).ToListAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, TopicStats>> GetStatsByTopicIdsAsync(
        IEnumerable<Guid> topicIds, CancellationToken cancellationToken = default)
    {
        var idList = topicIds.ToList();

        var stats = await _db.Vocabularies
            .Where(v => idList.Contains(v.TopicId))
            .GroupBy(v => v.TopicId)
            .Select(g => new
            {
                TopicId = g.Key,
                WordCount = g.Count(),
                LastModifiedAt = g.Max(v => (DateTime?)v.UpdatedAt) // <-- v.UpdatedAt: ĐANG ĐOÁN
            })
            .ToListAsync(cancellationToken);

        // Topic nào không có từ nào sẽ không xuất hiện ở đây -> TopicService tự xử lý thành (0, null)
        return stats.ToDictionary(s => s.TopicId, s => new TopicStats(s.WordCount, s.LastModifiedAt));
    }

    public Task<bool> ExistsByNameAsync(
        Guid userId, string name, Guid? excludeTopicId = null, CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim().ToLower();

        var query = _db.Topics.Where(t =>
            t.UserId == userId &&
            t.Name.Trim().ToLower() == normalizedName);

        if (excludeTopicId is not null)
        {
            query = query.Where(t => t.Id != excludeTopicId);
        }

        return query.AnyAsync(cancellationToken);
    }

    public async Task AddAsync(Topic topic, CancellationToken cancellationToken = default) =>
        await _db.Topics.AddAsync(topic, cancellationToken);

    public void Update(Topic topic) => _db.Topics.Update(topic);

    public void Delete(Topic topic) => _db.Topics.Remove(topic);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}