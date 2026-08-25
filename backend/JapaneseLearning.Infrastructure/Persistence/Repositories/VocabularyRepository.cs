using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Domain.Entities;
using JapaneseLearning.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JapaneseLearning.Infrastructure.Persistence.Repositories;

public class VocabularyRepository : IVocabularyRepository
{
    private readonly AppDbContext _db;

    public VocabularyRepository(AppDbContext db) => _db = db;

    public Task<Vocabulary?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Vocabularies.FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

    public async Task<(List<Vocabulary> Items, int TotalCount)> GetByTopicIdAsync(
        Guid topicId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Vocabularies.Where(v => v.TopicId == topicId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(v =>
                (v.Hiragana != null && v.Hiragana.ToLower().Contains(normalizedSearch)) ||
                (v.Katakana != null && v.Katakana.ToLower().Contains(normalizedSearch)) ||
                (v.Kanji != null && v.Kanji.ToLower().Contains(normalizedSearch)) ||
                v.Romaji.ToLower().Contains(normalizedSearch) ||
                v.Meaning.ToLower().Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(v => v.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<(List<Vocabulary> Items, int TotalCount)> SearchByUserIdAsync(
        Guid userId,
        string query,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedSearch = query.Trim().ToLower();

        // Không có navigation Vocabulary -> Topic, nên phải join tay
        // (giống cách PracticeSessionRepository đã join Character theo Id)
        var baseQuery =
            from v in _db.Vocabularies
            join t in _db.Topics on v.TopicId equals t.Id
            where t.UserId == userId &&
                  ((v.Hiragana != null && v.Hiragana.ToLower().Contains(normalizedSearch)) ||
                   (v.Katakana != null && v.Katakana.ToLower().Contains(normalizedSearch)) ||
                   (v.Kanji != null && v.Kanji.ToLower().Contains(normalizedSearch)) ||
                   v.Romaji.ToLower().Contains(normalizedSearch) ||
                   v.Meaning.ToLower().Contains(normalizedSearch))
            select v;

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var items = await baseQuery
            .OrderByDescending(v => v.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<List<Vocabulary>> FindByRomajiAsync(
        Guid userId,
        string romaji,
        CancellationToken cancellationToken = default)
    {
        var normalizedRomaji = romaji.Trim().ToLower();

        var query =
            from v in _db.Vocabularies
            join t in _db.Topics on v.TopicId equals t.Id
            where t.UserId == userId && v.Romaji.Trim().ToLower() == normalizedRomaji
            select v;

        return await query.ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Vocabulary vocabulary, CancellationToken cancellationToken = default) =>
        await _db.Vocabularies.AddAsync(vocabulary, cancellationToken);

    public async Task<List<Vocabulary>> GetByTopicIdsAsync(
        IEnumerable<Guid> topicIds,
        CancellationToken cancellationToken = default)
    {
        return await _db.Vocabularies
            .Where(v => topicIds.Contains(v.TopicId))
            .ToListAsync(cancellationToken);
    }
    
    public void Update(Vocabulary vocabulary) => _db.Vocabularies.Update(vocabulary);

    public void Delete(Vocabulary vocabulary) => _db.Vocabularies.Remove(vocabulary);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}