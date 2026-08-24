using System.Text.Json;
using JapaneseLearning.Application.Common.Exceptions;

namespace JapaneseLearning.Api.Middleware;

// Middleware = 1 "trạm kiểm soát" bọc quanh mọi request (tương đương Servlet Filter Java).
// Bắt AppException ném lên từ Application, dịch sang đúng Error Envelope (api_design.md mục 0)
// thay vì để lỗi 500 mặc định xấu xí của ASP.NET.
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    // camelCase cho mọi property khi serialize JSON trả về client (đúng chuẩn api_design.md,
    // vì mặc định JsonSerializer giữ nguyên PascalCase của property C#)
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = ex.StatusCode;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = new { code = ex.Code, message = ex.Message, details = ex.Details }
            }, JsonOptions));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi không xác định");
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = 500;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = new { code = "INTERNAL_SERVER_ERROR", message = "Đã có lỗi xảy ra, vui lòng thử lại sau", details = (object?)null }
            }, JsonOptions));
        }
    }
}