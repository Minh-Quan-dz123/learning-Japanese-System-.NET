namespace JapaneseLearning.Application.Features.Vocabularies.Dtos;

public record SourceModeDto(string Type, int? Percent, int? Count);

public record PracticePrepareRequest(
    List<Guid> TopicIds,
    string QuestionField,
    string AnswerField,
    SourceModeDto SourceMode
);