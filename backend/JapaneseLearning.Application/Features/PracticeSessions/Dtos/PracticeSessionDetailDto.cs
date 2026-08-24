namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record PracticeSessionDetailDto(
    Guid Id,
    string ModuleType,
    string Direction,
    int TimePerQuestionSec,
    int MaxMistakes,
    int Score,
    int TotalQuestions,
    DateTime CreatedAt,
    IReadOnlyList<PracticeAnswerDetailDto> Answers
);