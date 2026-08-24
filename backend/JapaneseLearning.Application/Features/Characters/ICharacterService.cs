using JapaneseLearning.Application.Features.Characters.Dtos;

namespace JapaneseLearning.Application.Features.Characters;

public interface ICharacterService
{
    // type: nhận string thô từ query (?type=hiragana), Service tự parse — xem lý do ở phần giải thích trước đó
    Task<List<CharacterDto>> GetByTypeAsync(string? type, CancellationToken cancellationToken = default);

    Task<CharacterDto> CreateAsync(CreateCharacterRequest request, bool isAdmin, CancellationToken cancellationToken = default);

    Task<CharacterDto> UpdateAsync(Guid id, UpdateCharacterRequest request, bool isAdmin, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid id, bool isAdmin, CancellationToken cancellationToken = default);
}