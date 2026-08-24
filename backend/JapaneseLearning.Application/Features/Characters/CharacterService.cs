using JapaneseLearning.Application.Common.Exceptions;
using JapaneseLearning.Application.Common.Interfaces;
using JapaneseLearning.Application.Features.Characters.Dtos;
using JapaneseLearning.Domain.Entities;

namespace JapaneseLearning.Application.Features.Characters;

public class CharacterService : ICharacterService
{
    private readonly ICharacterRepository _repository;

    public CharacterService(ICharacterRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<CharacterDto>> GetByTypeAsync(string? type, CancellationToken cancellationToken = default)
    {
        CharacterType? parsedType = null;

        // type = null hoặc rỗng -> lấy tất cả, không coi là lỗi
        if (!string.IsNullOrWhiteSpace(type))
        {
            if (!Enum.TryParse<CharacterType>(type, ignoreCase: true, out var result))
            {
                throw new ValidationFailedException(new[]
                {
                    new FieldError("type", $"Giá trị 'type' không hợp lệ. Chỉ chấp nhận: {string.Join(", ", Enum.GetNames<CharacterType>())}")
                });
            }
            parsedType = result;
        }

        var characters = await _repository.GetByTypeAsync(parsedType, cancellationToken);
        return characters.Select(ToDto).ToList();
    }

    public async Task<CharacterDto> CreateAsync(CreateCharacterRequest request, bool isAdmin, CancellationToken cancellationToken = default)
    {
        EnsureIsAdmin(isAdmin);
        var (type, variantGroup) = ParseAndValidate(request.Type, request.VariantGroup);

        var character = new Character
        {
            Id = Guid.NewGuid(),
            Char = request.Char,
            Romaji = request.Romaji,
            Type = type,
            VariantGroup = variantGroup
        };

        await _repository.AddAsync(character, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return ToDto(character);
    }

    public async Task<CharacterDto> UpdateAsync(Guid id, UpdateCharacterRequest request, bool isAdmin, CancellationToken cancellationToken = default)
    {
        EnsureIsAdmin(isAdmin);

        var character = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new CharacterNotFoundException(id);

        var (type, variantGroup) = ParseAndValidate(request.Type, request.VariantGroup);

        character.Char = request.Char;
        character.Romaji = request.Romaji;
        character.Type = type;
        character.VariantGroup = variantGroup;

        _repository.Update(character);
        await _repository.SaveChangesAsync(cancellationToken);

        return ToDto(character);
    }

    public async Task DeleteAsync(Guid id, bool isAdmin, CancellationToken cancellationToken = default)
    {
        EnsureIsAdmin(isAdmin);

        var character = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new CharacterNotFoundException(id);

        _repository.Delete(character);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    // ---- helper riêng, không phải một phần của interface ----

    private static void EnsureIsAdmin(bool isAdmin)
    {
        if (!isAdmin)
        {
            throw new ForbiddenException();
        }
    }

    private static (CharacterType Type, VariantGroup VariantGroup) ParseAndValidate(string typeRaw, string variantGroupRaw)
    {
        var errors = new List<FieldError>();

        var typeOk = Enum.TryParse<CharacterType>(typeRaw, ignoreCase: true, out var type);
        if (!typeOk)
        {
            errors.Add(new FieldError("type", $"Giá trị 'type' không hợp lệ. Chỉ chấp nhận: {string.Join(", ", Enum.GetNames<CharacterType>())}"));
        }

        var variantGroupOk = Enum.TryParse<VariantGroup>(variantGroupRaw, ignoreCase: true, out var variantGroup);
        if (!variantGroupOk)
        {
            errors.Add(new FieldError("variantGroup", $"Giá trị 'variantGroup' không hợp lệ. Chỉ chấp nhận: {string.Join(", ", Enum.GetNames<VariantGroup>())}"));
        }

        if (errors.Count > 0)
        {
            throw new ValidationFailedException(errors);
        }

        return (type, variantGroup);
    }

    private static CharacterDto ToDto(Character character) => new(
        character.Id,
        character.Char,
        character.Romaji,
        character.Type.ToString(),
        character.VariantGroup.ToString()
    );
}