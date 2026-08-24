namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record PracticeSessionSummaryDto(
    Guid Id,
    string ModuleType,
    string Direction,
    int Score,
    int TotalQuestions,
    DateTime CreatedAt
);