namespace JapaneseLearning.Application.Common.Exceptions;

public class PracticeSessionNotFoundException : AppException
{
    public PracticeSessionNotFoundException(Guid id)
        : base("NOT_FOUND", $"Không tìm thấy lượt luyện tập với id {id}", 404)
    {
    }
}