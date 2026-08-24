namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record AnswerResultDto(
    Guid CharacterId,
    Guid? SelectedCharacterId,
    bool IsCorrect
);