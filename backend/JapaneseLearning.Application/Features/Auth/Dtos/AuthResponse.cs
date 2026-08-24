namespace JapaneseLearning.Application.Features.Auth.Dtos;

// "Hàng lên kệ" — thứ thật sự trả về client qua JSON (không có RefreshTokenPlain).
public class AuthResponse
{
    public required string AccessToken { get; set; }
    public required UserDto User { get; set; }
}
