namespace JapaneseLearning.Application.Common.Exceptions;

public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "Bạn không có quyền thực hiện thao tác này")
        : base("FORBIDDEN", message, 403)
    {
    }
}