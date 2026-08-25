namespace JapaneseLearning.Application.Common.Exceptions;

public class TopicNameDuplicateException : AppException
{
    public TopicNameDuplicateException(string name)
        : base("TOPIC_NAME_DUPLICATE", $"Tên chủ đề \"{name}\" đã tồn tại", 409)
    {
    }
}