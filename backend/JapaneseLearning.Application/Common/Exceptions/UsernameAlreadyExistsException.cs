namespace JapaneseLearning.Application.Common.Exceptions;

public class UsernameAlreadyExistsException : AppException
{
    public UsernameAlreadyExistsException(string username)
        : base("USERNAME_ALREADY_EXISTS", $"Tên đăng nhập '{username}' đã tồn tại", 409) { }
}