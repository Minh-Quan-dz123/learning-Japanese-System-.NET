namespace JapaneseLearning.Application.Features.Characters.Dtos;

public record CharacterDto(
    Guid Id,
    string Char,
    string Romaji,
    string Type,
    string VariantGroup
);