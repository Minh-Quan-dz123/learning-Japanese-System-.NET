namespace JapaneseLearning.Application.Common.Exceptions;

public class TopicNotFoundException : AppException
{
    public TopicNotFoundException(Guid id)
        : base("NOT_FOUND", $"Không tìm thấy chủ đề với id {id}", 404)
    {
    }
}