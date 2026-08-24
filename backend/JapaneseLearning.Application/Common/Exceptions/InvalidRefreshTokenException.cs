namespace JapaneseLearning.Application.Common.Exceptions;

public class InvalidRefreshTokenException : AppException
{
    public InvalidRefreshTokenException()
        : base("INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ hoặc đã hết hạn", 401) { }
}