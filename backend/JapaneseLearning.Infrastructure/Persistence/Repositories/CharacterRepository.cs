using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Domain.Entities;
using JapaneseLearning.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JapaneseLearning.Infrastructure.Persistence.Repositories;

public class CharacterRepository : ICharacterRepository
{
    private readonly AppDbContext _db;
    public CharacterRepository(AppDbContext db) => _db = db;

    public Task<List<Character>> GetByTypeAsync(CharacterType? type, CancellationToken ct = default)
    {
        var query = _db.Characters.AsQueryable();

        if (type is not null)
        {
            query = query.Where(c => c.Type == type);
        }

        return query.ToListAsync(ct);
    }

    public Task<Character?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Characters.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<List<Character>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default) =>
    _db.Characters.Where(c => ids.Contains(c.Id)).ToListAsync(ct);

    public async Task AddAsync(Character character, CancellationToken ct = default) =>
        await _db.Characters.AddAsync(character, ct);

    public void Update(Character character) => _db.Characters.Update(character);

    public void Delete(Character character) => _db.Characters.Remove(character);

    public Task SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}