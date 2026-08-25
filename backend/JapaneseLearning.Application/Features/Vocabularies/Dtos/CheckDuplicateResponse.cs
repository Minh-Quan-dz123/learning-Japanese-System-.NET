namespace JapaneseLearning.Application.Features.Vocabularies.Dtos;

public record CheckDuplicateResponse(bool Exists, ExistingVocabularyDto? Existing);

public record ExistingVocabularyDto(
    Guid Id,
    Guid TopicId,
    string? Hiragana,
    string Romaji,
    string Meaning,
    string MatchedMeaning);