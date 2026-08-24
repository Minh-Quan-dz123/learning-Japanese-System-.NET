namespace JapaneseLearning.Application.Features.Characters.Dtos;

public record UpdateCharacterRequest(
    string Char,
    string Romaji,
    string Type,
    string VariantGroup
);