namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record SubmitAnswerDto(
    Guid CharacterId,
    Guid? SelectedCharacterId
);