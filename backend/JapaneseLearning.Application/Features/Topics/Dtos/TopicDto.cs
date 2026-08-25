namespace JapaneseLearning.Application.Features.Topics.Dtos;

public record TopicDto(
    Guid Id,
    string Name,
    int WordCount,
    DateTime? LastModifiedAt,
    DateTime CreatedAt);