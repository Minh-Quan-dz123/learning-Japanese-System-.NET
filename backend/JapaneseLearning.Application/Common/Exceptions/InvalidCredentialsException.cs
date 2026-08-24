namespace JapaneseLearning.Application.Common.Exceptions;

public class InvalidCredentialsException : AppException
{
    public InvalidCredentialsException()
        : base("INVALID_CREDENTIALS", "Sai tên đăng nhập hoặc mật khẩu", 401) { }
}