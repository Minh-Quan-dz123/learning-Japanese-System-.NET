namespace JapaneseLearning.Application.Common.Exceptions;

// Application KHÔNG được biết ASP.NET là gì (nguyên tắc Clean Architecture),
// nên StatusCode ở đây chỉ là số int thường, không dùng hằng số StatusCodes của Microsoft.AspNetCore.
public class AppException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }
    public IReadOnlyList<FieldError>? Details { get; }

    public AppException(string code, string message, int statusCode, IReadOnlyList<FieldError>? details = null)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
        Details = details;
    }
}

// 1 lỗi ứng với 1 field cụ thể trong body request — dùng cho response VALIDATION_FAILED
// nhiều lỗi cùng lúc (xem mẫu JSON ở api_design.md mục 0)
public record FieldError(string Field, string Message);