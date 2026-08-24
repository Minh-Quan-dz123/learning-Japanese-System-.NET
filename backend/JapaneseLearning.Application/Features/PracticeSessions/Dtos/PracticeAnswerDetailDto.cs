namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record PracticeAnswerDetailDto(
    int AnswerOrder,
    CharacterMiniDto? Character,
    CharacterMiniDto? SelectedCharacter,
    bool IsCorrect
);