namespace JapaneseLearning.Infrastructure.Security;

// "Options pattern" của .NET — giống đọc nguyên 1 khối config vào 1 struct,
// thay vì rải đọc lẻ tẻ từng key string khắp nơi trong code.
public class JwtSettings
{
    public required string Secret { get; set; }
    public required string Issuer { get; set; }
    public required string Audience { get; set; }
    public required int AccessTokenExpiryMinutes { get; set; }
}