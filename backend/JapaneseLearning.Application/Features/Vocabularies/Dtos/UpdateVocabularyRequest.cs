namespace JapaneseLearning.Application.Features.Vocabularies.Dtos;

public record UpdateVocabularyRequest(
    Guid? TopicId,
    string? Hiragana,
    string? Katakana,
    string? Kanji,
    string Romaji,
    string Meaning,
    string? Note);