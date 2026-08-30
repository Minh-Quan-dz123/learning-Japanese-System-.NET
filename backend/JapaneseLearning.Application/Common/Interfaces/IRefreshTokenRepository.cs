using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Common.Interfaces;

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken ct = default);
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task RevokeAsync(RefreshToken token, CancellationToken ct = default);

    // MỚI: Lấy toàn bộ token đang "sống" (chưa revoke, chưa hết hạn) của 1 user,
    // sắp xếp theo ExpiresAt TĂNG DẦN — phần tử đầu tiên là token "cũ nhất"
    // (vì ExpiresAt = CreatedAt + hằng số cố định, sắp theo ExpiresAt tăng dần
    // tương đương sắp theo thời điểm tạo tăng dần, miễn hằng số không đổi giữa các token).
    // Dùng để enforce giới hạn "tối đa N phiên đăng nhập cùng lúc" (xem AuthService.IssueTokensAsync).
    Task<List<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken ct = default);

    // Xóa hàng loạt refresh token đã hết hạn HOẶC đã bị revoke (RevokedAt khác NULL), trả về số dòng đã xóa.
    // Không cần tham số retention nữa — RevokeAsync() đã xóa ngay lúc revoke, nhánh RevokedAt ở đây
    // chỉ là lớp dọn dẹp phòng hờ cho dữ liệu cũ/sót lại, không cần chờ thêm thời gian nào.
    Task<int> DeleteExpiredAsync(CancellationToken ct = default);
}