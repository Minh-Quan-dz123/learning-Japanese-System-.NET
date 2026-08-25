namespace JapaneseLearning.Application.Features.Vocabularies.Dtos;

public record PracticePrepareResponse(
    int TotalConsidered,
    int TotalEligible,
    List<VocabularyDto> Words
);