namespace JapaneseLearning.Application.Features.Vocabularies.Dtos;

public record VocabularyDto(
    Guid Id,
    Guid TopicId,
    string? Hiragana,
    string? Katakana,
    string? Kanji,
    string Romaji,
    string Meaning,
    string? Note,
    DateTime CreatedAt,
    DateTime UpdatedAt);