namespace JapaneseLearning.Application.Features.PracticeSessions.Dtos;

public record SubmitPracticeSessionRequest(
    string ModuleType,
    string Direction,
    int TimePerQuestionSec,
    int MaxMistakes,
    IReadOnlyList<SubmitAnswerDto> Answers
);