namespace JapaneseLearning.Application.Common.Exceptions;

public class VocabularyNotFoundException : AppException
{
    public VocabularyNotFoundException(Guid id)
        : base("NOT_FOUND", $"Không tìm thấy từ vựng với id {id}", 404)
    {
    }
}