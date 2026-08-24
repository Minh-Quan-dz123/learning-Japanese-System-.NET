namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record PracticeSessionResultDto(
    Guid Id,
    int Score,
    int TotalQuestions,
    DateTime CreatedAt,
    IReadOnlyList<AnswerResultDto> Results
);