namespace JapaneseLearning.Application.Features.Characters.Dtos;

public record CharacterStatDto(
    Guid CharacterId,
    string Char,
    string Romaji,
    int TotalAnswered,
    int WrongCount,
    double WrongRate
);