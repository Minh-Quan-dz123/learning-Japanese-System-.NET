using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Domain.Entities;
using JapaneseLearning.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JapaneseLearning.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _db;
    public RefreshTokenRepository(AppDbContext db) => _db = db;

    public async Task AddAsync(RefreshToken token, CancellationToken ct = default)
    {
        await _db.RefreshTokens.AddAsync(token, ct);
        await _db.SaveChangesAsync(ct);
    }

    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
        _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public async Task RevokeAsync(RefreshToken token, CancellationToken ct = default)
    {
        // Thay đổi 2026-08-30: xóa hẳn dòng thay vì chỉ đánh dấu RevokedAt.
        // Lý do: DB dung lượng nhỏ, server hay bị restart (Render free tier tự sleep/wake) —
        // không cần giữ lại token đã vô hiệu để tra cứu, xóa ngay cho gọn.
        _db.RefreshTokens.Remove(token);
        await _db.SaveChangesAsync(ct);
    }

    // MỚI: phục vụ giới hạn "tối đa N phiên đăng nhập cùng lúc" (xem AuthService.IssueTokensAsync).
    // "Active" = chưa bị revoke VÀ chưa hết hạn. Phải check cả ExpiresAt (không chỉ RevokedAt)
    // vì cleanup job (RefreshTokenCleanupService) chạy định kỳ chứ không tức thời —
    // có thể còn sót vài dòng đã hết hạn nhưng chưa kịp bị xóa.
    public Task<List<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        return _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
            .OrderBy(t => t.ExpiresAt) // tăng dần -> phần tử đầu = hết hạn sớm nhất = tạo sớm nhất
            .ToListAsync(ct);
    }

    public async Task<int> DeleteExpiredAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        return await _db.RefreshTokens
            .Where(rt => rt.ExpiresAt < now || rt.RevokedAt != null)
            .ExecuteDeleteAsync(ct);
    }
}