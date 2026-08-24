namespace JapaneseLearning.Application.Features.Auth.Dtos;

// "Hàng trong kho" — có RefreshTokenPlain để Controller lấy set cookie,
// KHÔNG lộ ra JSON body (đúng quyết định "refresh token qua cookie").
public class AuthResult
{
    public required string AccessToken { get; set; }
    public required string RefreshTokenPlain { get; set; }
    public required UserDto User { get; set; }
}