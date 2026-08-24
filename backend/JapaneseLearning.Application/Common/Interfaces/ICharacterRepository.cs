using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Common.Interfaces;

public interface ICharacterRepository
{
    Task<List<Character>> GetByTypeAsync(CharacterType? type, CancellationToken cancellationToken = default);

    Task<Character?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    // MỚI (2026-08-24) — lấy nhiều Character cùng lúc theo danh sách id, tránh N+1 query
    // Character nào không tồn tại (đã bị Admin xóa) thì không có trong kết quả trả về
    Task<List<Character>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default);

    Task AddAsync(Character character, CancellationToken cancellationToken = default);

    void Update(Character character);

    void Delete(Character character);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}