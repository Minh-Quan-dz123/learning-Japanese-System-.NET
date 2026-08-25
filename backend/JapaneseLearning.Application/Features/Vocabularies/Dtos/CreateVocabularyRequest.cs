namespace JapaneseLearning.Application.Features.Vocabularies.Dtos;

public record CreateVocabularyRequest(
    Guid TopicId,
    string? Hiragana,
    string? Katakana,
    string? Kanji,
    string Romaji,
    string Meaning,
    string? Note);