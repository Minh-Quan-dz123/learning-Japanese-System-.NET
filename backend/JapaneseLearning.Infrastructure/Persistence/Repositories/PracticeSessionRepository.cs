using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Features.Characters.Dtos;
using JapaneseLearning.Domain.Entities;
using JapaneseLearning.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JapaneseLearning.Infrastructure.Persistence.Repositories;

public class PracticeSessionRepository : IPracticeSessionRepository
{
    private readonly AppDbContext _db;
    public PracticeSessionRepository(AppDbContext db) => _db = db;

    // ---- Unit of Work: Add chỉ đánh dấu, chưa ghi DB ----

    public async Task AddSessionAsync(PracticeSession session, CancellationToken ct = default) =>
        await _db.PracticeSessions.AddAsync(session, ct);

    public async Task AddAnswersAsync(IEnumerable<PracticeAnswer> answers, CancellationToken ct = default) =>
        await _db.PracticeAnswers.AddRangeAsync(answers, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    // ---- Đọc dữ liệu cho GetDetailAsync ----

    public Task<PracticeSession?> GetSessionByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.PracticeSessions.FirstOrDefaultAsync(s => s.Id == id, ct);

    public Task<List<PracticeAnswer>> GetAnswersBySessionIdAsync(Guid sessionId, CancellationToken ct = default) =>
        _db.PracticeAnswers.Where(a => a.SessionId == sessionId).ToListAsync(ct);

    // ---- Đọc danh sách phân trang cho GetMyHistoryAsync ----

    public async Task<(List<PracticeSession> Items, int TotalCount)> GetByUserIdAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.PracticeSessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt); // mới nhất lên đầu

        var totalCount = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return (items, totalCount);
    }

    // ---- Thống kê tỉ lệ sai (GROUP BY character_id) ----

    public async Task<IReadOnlyList<CharacterStatDto>> GetWrongRateStatsAsync(Guid userId, CancellationToken ct = default)
    {
        // INNER JOIN với Characters tự loại bỏ answer có CharacterId = null (đã bị xóa) —
        // không cần WHERE riêng, theo đúng quyết định "loại hẳn khỏi thống kê" (DECISIONS_LOG.md)
        var raw = await (
            from pa in _db.PracticeAnswers
            join ps in _db.PracticeSessions on pa.SessionId equals ps.Id
            join c in _db.Characters on pa.CharacterId equals (Guid?)c.Id
            where ps.UserId == userId
            group pa by new { c.Id, c.Char, c.Romaji } into g
            select new
            {
                CharacterId = g.Key.Id,
                g.Key.Char,
                g.Key.Romaji,
                TotalAnswered = g.Count(),
                WrongCount = g.Count(x => !x.IsCorrect)
            }
        ).ToListAsync(ct);

        // Map sang record ở bộ nhớ (không tính WrongRate ngay trong câu SQL, tránh EF Core
        // dịch phép chia phức tạp sai ý — an toàn hơn khi tách bước tính toán ra khỏi query)
        return raw.Select(r => new CharacterStatDto(
            r.CharacterId,
            r.Char,
            r.Romaji,
            r.TotalAnswered,
            r.WrongCount,
            r.TotalAnswered == 0 ? 0 : Math.Round((double)r.WrongCount / r.TotalAnswered, 4)
        )).ToList();
    }
}