namespace JapaneseLearning.Application.Features.Characters.Dtos;

public record CreateCharacterRequest(
    string Char,
    string Romaji,
    string Type,
    string VariantGroup
);