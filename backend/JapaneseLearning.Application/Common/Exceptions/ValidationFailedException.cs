namespace JapaneseLearning.Application.Common.Exceptions;

public class ValidationFailedException : AppException
{
    public ValidationFailedException(IReadOnlyList<FieldError> details)
        : base("VALIDATION_FAILED", "Dữ liệu không hợp lệ", 400, details)
    {
    }
}